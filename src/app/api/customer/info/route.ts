export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getRestaurantFromSlug } from "@/lib/auth";
import { getPrismaClient } from "@/lib/db";
import type { Country } from "@/types";

/**
 * GET /api/customer/info?restaurant=<slug>&table=<number>
 *
 * Public endpoint — no auth required. Returns the restaurant, table, and
 * assigned AI waiter details needed to bootstrap the customer app.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug        = searchParams.get("restaurant")?.trim() ?? "";
    const tableNumber = parseInt(searchParams.get("table") ?? "", 10);

    if (!slug) {
      return NextResponse.json(
        { error: "Missing restaurant parameter." },
        { status: 400 }
      );
    }
    if (isNaN(tableNumber)) {
      return NextResponse.json(
        { error: "Invalid table number." },
        { status: 400 }
      );
    }

    // ── Restaurant lookup (searches both CA and DE schemas) ─────────────
    let restaurant: Awaited<ReturnType<typeof getRestaurantFromSlug>>;
    try {
      restaurant = await getRestaurantFromSlug(slug);
    } catch {
      return NextResponse.json(
        { error: "Restaurant not found." },
        { status: 404 }
      );
    }
    if (restaurant.status !== "active") {
      return NextResponse.json(
        { error: "This restaurant is not currently accepting orders." },
        { status: 403 }
      );
    }

    const db = getPrismaClient(restaurant.country as Country);

    // ── Table lookup (by composite key restaurantId + number) ────────────
    const table = await db.table.findUnique({
      where: {
        restaurantId_number: {
          restaurantId: restaurant.id,
          number:       tableNumber,
        },
      },
      select: {
        id:           true,
        number:       true,
        seats:        true,
        status:       true,
        mergedIntoId: true,
        waiter: {
          select: {
            id:          true,
            name:        true,
            avatar:      true,
            personality: true,
            tone:        true,
            languages:   true,
            greeting:    true,
          },
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Table not found." },
        { status: 404 }
      );
    }

    // ── If this table is merged into another, resolve to the primary ─────
    let effectiveTable = table;
    if (table.mergedIntoId) {
      const primary = await db.table.findUnique({
        where:  { id: table.mergedIntoId },
        select: {
          id:     true,
          number: true,
          seats:  true,
          status: true,
          waiter: {
            select: {
              id:          true,
              name:        true,
              avatar:      true,
              personality: true,
              tone:        true,
              languages:   true,
              greeting:    true,
            },
          },
        },
      });
      if (primary) {
        effectiveTable = { ...primary, mergedIntoId: table.mergedIntoId };
      }
    }

    // ── Session lock check (against effective / primary table) ───────────
    // Skipped for the public demo restaurant so any number of prospects can
    // open the customer experience at once — each gets their own session.
    if (!restaurant.isPublicDemo) {
      const sessionId = searchParams.get("sessionId")?.trim() ?? null;
      const activeSession = await db.tableSession.findFirst({
        where: { tableId: effectiveTable.id, endedAt: null },
        select: { id: true },
      });
      if (activeSession && sessionId !== activeSession.id) {
        return NextResponse.json({ error: "table_occupied" }, { status: 409 });
      }
    }

    // Strip internal status from restaurant before sending
    const { status: _status, ...restaurantPublic } = restaurant;

    return NextResponse.json({
      restaurant: restaurantPublic,
      // Return effective (primary) table ID for all operations,
      // but keep the original table number so the customer sees their physical table.
      table: {
        id:                    effectiveTable.id,
        number:                table.number,         // original scanned table number
        seats:                 effectiveTable.seats,
        status:                effectiveTable.status,
        mergedIntoPrimaryNum:  table.mergedIntoId ? effectiveTable.number : null,
      },
      waiter: effectiveTable.waiter ?? null,
    });
  } catch (error) {
    console.error("[GET /api/customer/info]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
