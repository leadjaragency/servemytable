export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getRequiredSession, getRestaurantIdFromSession, getPrismaForSession } from "@/lib/auth";
import { generateKitchenToken } from "@/lib/kitchen";
import { generateQR } from "@/lib/qr-generator";

// ---------------------------------------------------------------------------
// POST /api/restaurant/kitchen-token
// Owner-only. Rotates the restaurant's kitchen-display token, invalidating any
// previously shared kitchen link/QR. Returns the new token, URL, and QR image.
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    const session = await getRequiredSession();
    if (session.user.role !== "restaurant_owner") {
      return NextResponse.json(
        { error: "Only the restaurant owner can regenerate the kitchen link." },
        { status: 403 }
      );
    }
    const restaurantId = getRestaurantIdFromSession(session);
    const db = getPrismaForSession(session);

    const token = generateKitchenToken();
    await db.restaurant.update({
      where: { id: restaurantId },
      data:  { kitchenToken: token },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const url = `${baseUrl}/kitchen/${token}`;
    const qr  = await generateQR(url);

    return NextResponse.json({ token, url, qr });
  } catch (err) {
    console.error("[POST /api/restaurant/kitchen-token]", err);
    return NextResponse.json({ error: "Failed to regenerate kitchen link." }, { status: 500 });
  }
}
