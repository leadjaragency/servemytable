import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredSession, getRestaurantIdFromSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { prisma } from "@/lib/db";
import { isPublicDemoRestaurant } from "@/lib/demo-seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const restaurantId = getRestaurantIdFromSession(session);

    const members = await prisma.user.findMany({
      where:   { restaurantId, isActive: true },
      orderBy: { createdAt: "asc" },
      select:  { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json({
      members:     JSON.parse(JSON.stringify(members)),
      currentRole: session.user.role,
    });
  } catch (err) {
    console.error("[GET /api/restaurant/team]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const InviteSchema = z.object({
  name:     z.string().min(1).max(80),
  email:    z.string().email(),
  role:     z.enum(["restaurant_manager"]),
  password: z.string().min(6).max(100),
});

export async function POST(req: Request) {
  try {
    const session = await getRequiredSession();
    if (session.user.role !== "restaurant_owner") {
      return NextResponse.json(
        { error: "Only restaurant owners can invite team members" },
        { status: 403 }
      );
    }
    const restaurantId = getRestaurantIdFromSession(session);

    if (await isPublicDemoRestaurant(restaurantId)) {
      return NextResponse.json(
        { error: "Team management is disabled in the demo restaurant." },
        { status: 403 }
      );
    }

    const body   = await req.json().catch(() => ({}));
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const normalizedEmail = parsed.data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with that email already exists" },
        { status: 409 }
      );
    }

    // Create Supabase Auth user for the manager
    const { data: sbData, error: sbError } = await getSupabaseAdmin().auth.admin.createUser({
      email:         normalizedEmail,
      password:      parsed.data.password,
      email_confirm: true,
      user_metadata: {
        role:          "restaurant_manager",
        isActive:      true,
        restaurantId,
        restaurantSlug: session.user.restaurantSlug,
      },
    });

    if (sbError || !sbData.user) {
      console.error("[POST /api/restaurant/team] Supabase createUser:", sbError);
      return NextResponse.json({ error: "Failed to create user account" }, { status: 500 });
    }

    let user;
    try {
      user = await prisma.user.create({
        data: {
          supabaseUserId: sbData.user.id,
          name:           parsed.data.name,
          email:          normalizedEmail,
          role:           parsed.data.role,
          restaurantId,
          isActive:       true,
        },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
    } catch (prismaErr) {
      // Clean up the Supabase user if Prisma fails
      await getSupabaseAdmin().auth.admin.deleteUser(sbData.user.id).catch(() => {});
      throw prismaErr;
    }

    return NextResponse.json({ member: JSON.parse(JSON.stringify(user)) }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/restaurant/team]", err);
    return NextResponse.json({ error: "Failed to invite member" }, { status: 500 });
  }
}
