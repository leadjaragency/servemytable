import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequiredSession, getRestaurantIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPublicDemoRestaurant } from "@/lib/demo-seed";

const DEMO_BLOCKED = { error: "Team management is disabled in the demo restaurant." };

export const dynamic = "force-dynamic";

// Helper: ensure user belongs to the same restaurant and is not the owner calling on themselves
async function resolveTarget(restaurantId: string, userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, restaurantId },
    select: { id: true, role: true },
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const session = await getRequiredSession();
    if (!session || session.user.role !== "restaurant_owner") {
      return NextResponse.json({ error: "Owner only" }, { status: 403 });
    }
    const restaurantId = getRestaurantIdFromSession(session);
    if (await isPublicDemoRestaurant(restaurantId)) {
      return NextResponse.json(DEMO_BLOCKED, { status: 403 });
    }

    const target = await resolveTarget(restaurantId, userId);
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.role === "restaurant_owner") {
      return NextResponse.json({ error: "Cannot change owner role" }, { status: 400 });
    }

    const body   = await req.json().catch(() => ({}));
    const parsed = z.object({ role: z.enum(["restaurant_manager"]) }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const updated = await prisma.user.update({
      where:  { id: userId },
      data:   { role: parsed.data.role },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ member: updated });
  } catch (err) {
    console.error("[PUT /api/restaurant/team/[userId]]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const session = await getRequiredSession();
    if (!session || session.user.role !== "restaurant_owner") {
      return NextResponse.json({ error: "Owner only" }, { status: 403 });
    }
    const restaurantId = getRestaurantIdFromSession(session);
    if (await isPublicDemoRestaurant(restaurantId)) {
      return NextResponse.json(DEMO_BLOCKED, { status: 403 });
    }

    const target = await resolveTarget(restaurantId, userId);
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.role === "restaurant_owner") {
      return NextResponse.json({ error: "Cannot remove the owner" }, { status: 400 });
    }

    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/restaurant/team/[userId]]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
