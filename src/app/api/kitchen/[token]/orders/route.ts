export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  resolveKitchenRestaurant,
  KITCHEN_ORDER_INCLUDE,
  KITCHEN_ACTIVE_STATUSES,
} from "@/lib/kitchen";

type Ctx = { params: Promise<{ token: string }> };

// ---------------------------------------------------------------------------
// GET /api/kitchen/[token]/orders
// Public (token-gated). Returns the restaurant's active orders for the
// no-login kitchen display. The token is the authorization.
// ---------------------------------------------------------------------------

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { token } = await params;
    const resolved = await resolveKitchenRestaurant(token);
    if (!resolved) {
      return NextResponse.json({ error: "Invalid kitchen link." }, { status: 404 });
    }
    const { db, restaurant } = resolved;

    const orders = await db.order.findMany({
      where: {
        restaurantId: restaurant.id,
        status: { in: [...KITCHEN_ACTIVE_STATUSES] },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: KITCHEN_ORDER_INCLUDE,
    });

    return NextResponse.json({ restaurantName: restaurant.name, orders });
  } catch (error) {
    console.error("[GET /api/kitchen/[token]/orders]", error);
    return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
  }
}
