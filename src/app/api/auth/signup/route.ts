export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendWelcomeEmail } from "@/lib/email";
import { generateSlug } from "@/lib/utils";

const signupSchema = z.object({
  restaurantName: z.string().min(2).max(100),
  cuisine:        z.string().min(2).max(100),
  phone:          z.string().max(30).optional(),
  city:           z.string().max(120).optional(),
  ownerName:      z.string().min(2).max(100),
  email:          z.string().email(),
  password:       z.string().min(8).max(72),
  acceptTerms:    z.literal(true),                                  // required consent
  marketingOptIn: z.boolean().optional(),
  referralSource: z.string().max(40).optional(),
  approxTables:   z.coerce.number().int().positive().max(100000).optional(),
  planInterest:   z.enum(["basic", "standard", "premium"]).optional(),
});

// Removes a leftover Supabase Auth login for an email that no longer has a
// Prisma User — e.g. an orphan left behind when a restaurant was permanently
// purged but the best-effort Supabase delete failed. Returns true if an orphan
// was found and removed, so signup can retry and treat the email as brand new.
async function reclaimOrphanedAuthEmail(email: string): Promise<boolean> {
  const admin  = getSupabaseAdmin();
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return false;
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) {
      const { error: delErr } = await admin.auth.admin.deleteUser(match.id);
      if (delErr) {
        console.error("[signup] failed to delete orphaned auth user:", delErr);
        return false;
      }
      return true;
    }
    if (data.users.length < 200) return false; // reached the last page
  }
  return false;
}

// ---------------------------------------------------------------------------
// POST /api/auth/signup
// Creates a Supabase Auth user + pending Restaurant + restaurant_owner User.
// Sends a welcome email via Resend on success.
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  let supabaseUserId: string | null = null;

  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const {
      restaurantName, cuisine, phone, city, ownerName, email, password,
      marketingOptIn, referralSource, approxTables, planInterest,
    } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check for duplicate email in Prisma
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Generate unique restaurant slug
    const baseSlug = generateSlug(restaurantName);
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.restaurant.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    // Create Supabase Auth user (admin API — bypasses Supabase confirmation email).
    const createParams = {
      email: normalizedEmail,
      password,
      email_confirm: true, // mark email as confirmed — we send our own email via Resend
      user_metadata: {
        role:         "restaurant_owner",
        isActive:     false, // activated on super admin approval
        restaurantId: null,  // set after Prisma creates the restaurant
      },
    };

    let { data: sbData, error: sbError } = await getSupabaseAdmin().auth.admin.createUser(createParams);

    // We already confirmed no Prisma User owns this email, so a Supabase collision
    // means an orphaned login from a purged restaurant — reclaim it and retry once
    // so a returning restaurant is treated as a brand-new account.
    if (sbError || !sbData?.user) {
      const reclaimed = await reclaimOrphanedAuthEmail(normalizedEmail);
      if (reclaimed) {
        ({ data: sbData, error: sbError } = await getSupabaseAdmin().auth.admin.createUser(createParams));
      }
    }

    if (sbError || !sbData?.user) {
      console.error("[signup] Supabase createUser error:", sbError);
      return NextResponse.json(
        { error: "Failed to create account. Please try again." },
        { status: 500 }
      );
    }

    supabaseUserId = sbData.user.id;

    // Create Restaurant + User in a single Prisma transaction
    const { restaurant, user } = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name:           restaurantName,
          slug,
          cuisine,
          phone:          phone ?? null,
          city:           city ?? null,
          status:         "pending",
          referralSource: referralSource ?? null,
          approxTables:   approxTables ?? null,
          planInterest:   planInterest ?? null,
          marketingOptIn: marketingOptIn ?? false,
          termsAcceptedAt: new Date(),
        },
      });

      const user = await tx.user.create({
        data: {
          supabaseUserId,
          name:         ownerName,
          email:        normalizedEmail,
          role:         "restaurant_owner",
          restaurantId: restaurant.id,
          isActive:     false,
        },
      });

      return { restaurant, user };
    });

    // Back-fill restaurantId into Supabase user metadata
    await getSupabaseAdmin().auth.admin.updateUserById(supabaseUserId, {
      user_metadata: {
        role:         "restaurant_owner",
        isActive:     false,
        restaurantId: restaurant.id,
        restaurantSlug: slug,
      },
    });

    // Send welcome email (fire-and-forget — don't block the response)
    sendWelcomeEmail({
      to:             normalizedEmail,
      ownerName,
      restaurantName,
    }).catch((err) => console.error("[signup] Resend welcome email failed:", err));

    return NextResponse.json(
      {
        message:      "Application submitted. You will be notified once approved.",
        restaurantId: restaurant.id,
        userId:       user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    // Clean up the orphaned Supabase user if the Prisma transaction failed
    if (supabaseUserId) {
      await getSupabaseAdmin().auth.admin.deleteUser(supabaseUserId).catch(() => {});
    }
    console.error("[signup]", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
