export const dynamic = "force-dynamic";

import { getRequiredSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";


import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendApprovalEmail } from "@/lib/email";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const updateSchema = z.object({
  status:      z.enum(["active", "pending", "suspended", "disabled"]).optional(),
  tierId:      z.string().cuid().optional(),
  name:        z.string().min(2).max(100).optional(),
  cuisine:     z.string().min(2).max(100).optional(),
  tagline:     z.string().max(255).optional(),
  phone:       z.string().optional(),
  address:     z.string().optional(),
  email:       z.string().email().optional(),
  taxRate:     z.number().min(0).max(1).optional(),
  trialEndsAt: z.string().datetime().nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

async function guard() {
  const session = await getRequiredSession();
  if (!session || session.user.role !== "super_admin") return null;
  return session;
}

// ---------------------------------------------------------------------------
// GET /api/super-admin/restaurants/[id]
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    if (!(await guard())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [restaurant, ratingAgg] = await Promise.all([
      prisma.restaurant.findUnique({
        where: { id },
        include: {
          tier: true,
          users: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true, name: true, email: true,
              role: true, isActive: true, createdAt: true,
            },
          },
          _count: {
            select: { dishes: true, tables: true, orders: true, reviews: true },
          },
        },
      }),
      prisma.review.aggregate({
        where: { restaurantId: id },
        _avg: { rating: true },
      }),
    ]);

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return NextResponse.json({ ...restaurant, avgRating: ratingAgg._avg.rating });
  } catch (error) {
    console.error("[restaurant GET]", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/super-admin/restaurants/[id]
// Updates status, tier, or profile fields. Syncs user isActive with status.
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    if (!(await guard())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body   = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { status, tierId, trialEndsAt, ...rest } = parsed.data;

    // Fetch restaurant users before transaction (needed for Supabase sync)
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        users: {
          where: { supabaseUserId: { not: null } },
          select: { supabaseUserId: true, role: true, email: true, name: true },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Detect a genuine approval: a transition INTO "active" from any other status.
    // When this happens via the detail page (not the Approvals page), we must
    // still start the trial clock and send the approval email — otherwise the
    // owner is activated silently and never notified.
    const activating   = status === "active" && restaurant.status !== "active";
    const startTrialNow = activating && !restaurant.trialStartsAt;
    const now           = new Date();
    const computedTrialEndsAt = startTrialNow
      ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // +14 days
      : null;

    await prisma.$transaction(async (tx) => {
      await tx.restaurant.update({
        where: { id },
        data: {
          ...rest,
          ...(status !== undefined ? { status } : {}),
          ...(tierId !== undefined ? { tierId } : {}),
          ...(trialEndsAt !== undefined ? { trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null } : {}),
          ...(startTrialNow ? { trialStartsAt: now, trialEndsAt: computedTrialEndsAt } : {}),
        },
      });

      // Sync user active state with restaurant status
      if (status === "active") {
        await tx.user.updateMany({
          where: { restaurantId: id, role: "restaurant_owner" },
          data: { isActive: true },
        });
      } else if (status === "suspended" || status === "disabled") {
        await tx.user.updateMany({
          where: { restaurantId: id },
          data: { isActive: false },
        });
      }
    });

    // Sync trialEndsAt to Supabase user metadata for all restaurant users
    if (trialEndsAt !== undefined) {
      const supabaseAdmin = getSupabaseAdmin();
      await Promise.all(
        restaurant.users
          .filter((u) => u.supabaseUserId)
          .map((u) =>
            supabaseAdmin.auth.admin.updateUserById(u.supabaseUserId!, {
              user_metadata: {
                trialEndsAt: trialEndsAt ?? null,
              },
            })
          )
      );
    }

    // On approval (transition into active): start the trial in Supabase metadata
    // and email the owner(s) their approval — mirrors /api/auth/approve so that
    // approving from the detail page notifies the owner just the same.
    if (activating) {
      const effectiveTrialEndsAt =
        computedTrialEndsAt ??
        (trialEndsAt ? new Date(trialEndsAt) : restaurant.trialEndsAt ?? null);

      const supabaseAdmin = getSupabaseAdmin();
      for (const u of restaurant.users) {
        if (u.role !== "restaurant_owner" || !u.supabaseUserId) continue;

        await supabaseAdmin.auth.admin.updateUserById(u.supabaseUserId, {
          user_metadata: {
            role:           "restaurant_owner",
            isActive:       true,
            restaurantId:   id,
            restaurantSlug: restaurant.slug,
            ...(effectiveTrialEndsAt ? { trialEndsAt: effectiveTrialEndsAt.toISOString() } : {}),
          },
        });

        if (effectiveTrialEndsAt) {
          // fire-and-forget — a failed email must not fail the approval
          sendApprovalEmail({
            to:             u.email,
            ownerName:      u.name,
            restaurantName: restaurant.name,
            trialEndsAt:    effectiveTrialEndsAt,
          }).catch((err) =>
            console.error("[restaurant PUT] approval email failed:", err)
          );
        }
      }
    }

    return NextResponse.json({ message: "Updated successfully" });
  } catch (error) {
    console.error("[restaurant PUT]", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/super-admin/restaurants/[id]
// Soft-delete: sets status "disabled", deactivates users.
// Blocked for active restaurants — disable first.
// ---------------------------------------------------------------------------

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    if (!(await guard())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: { status: true, name: true },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    if (restaurant.status === "active") {
      return NextResponse.json(
        { error: "Disable the restaurant before deleting it." },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.restaurant.update({
        where: { id },
        data: { status: "disabled" },
      }),
      prisma.user.updateMany({
        where: { restaurantId: id },
        data: { isActive: false },
      }),
    ]);

    return NextResponse.json({ message: `${restaurant.name} has been removed.` });
  } catch (error) {
    console.error("[restaurant DELETE]", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
