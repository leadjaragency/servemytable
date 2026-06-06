import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequiredSession, getRestaurantIdFromSession, getPrismaForSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getRequiredSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const restaurantId = getRestaurantIdFromSession(session);
    const db = getPrismaForSession(session);

    const restaurant = await db.restaurant.findUnique({
      where:  { id: restaurantId },
      select: {
        id: true, name: true, slug: true, cuisine: true, tagline: true,
        phone: true, email: true, address: true, hours: true,
        city: true, province: true, postalCode: true, timezone: true,
        website: true, branding: true, setupCompletedAt: true,
        taxRate: true, currency: true, logoUrl: true, defaultLanguage: true,
        tier: { select: { name: true, features: true } },
      },
    });
    if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ restaurant: JSON.parse(JSON.stringify(restaurant)) });
  } catch (err) {
    console.error("[GET /api/restaurant/profile]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const UpdateSchema = z.object({
  name:            z.string().min(1).max(100).optional(),
  cuisine:         z.string().min(1).max(60).optional(),
  tagline:         z.string().max(200).optional(),
  phone:           z.string().max(30).optional(),
  email:           z.string().email().optional(),
  address:         z.string().max(300).optional(),
  city:            z.string().max(120).optional(),
  province:        z.string().max(120).optional(),
  postalCode:      z.string().max(20).optional(),
  timezone:        z.string().max(64).optional(),
  website:         z.string().max(200).optional(),
  branding:        z.record(z.string(), z.any()).optional(),
  taxRate:         z.number().min(0).max(1).optional(),
  currency:        z.enum(["CAD", "USD", "EUR"]).optional(),
  hours:           z.object({ open: z.string(), close: z.string() }).optional(),
  defaultLanguage: z.enum(["en", "de", "fr", "es"]).optional(),
  setupCompletedAt: z.coerce.date().nullable().optional(),
});

export async function PUT(req: Request) {
  try {
    const session = await getRequiredSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const restaurantId = getRestaurantIdFromSession(session);
    const db = getPrismaForSession(session);

    const body   = await req.json().catch(() => ({}));
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const updated = await db.restaurant.update({
      where: { id: restaurantId },
      data:  parsed.data,
    });
    return NextResponse.json({ restaurant: JSON.parse(JSON.stringify(updated)) });
  } catch (err) {
    console.error("[PUT /api/restaurant/profile]", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
