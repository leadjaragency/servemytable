export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getRestaurantFromSlug } from "@/lib/auth";
import { getPrismaClient, prisma as prismaCA, prismaDE } from "@/lib/db";
import type { Country } from "@/types";
import { z } from "zod";

const CreateSessionSchema = z.object({
  restaurantSlug: z.string().min(1),
  tableNumber:    z.number().int().positive(),
});

/**
 * POST /api/sessions
 * Body: { restaurantSlug: string, tableNumber: number }
 *
 * Public endpoint — no auth. Creates a TableSession, marks the table as
 * "occupied", and returns the sessionId + assigned AI waiter info.
 */
export async function POST(req: Request) {
  try {
    const body   = await req.json();
    const parsed = CreateSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }

    const { restaurantSlug, tableNumber } = parsed.data;

    // ── Validate restaurant (searches both CA and DE schemas) ────────────
    let restaurant: Awaited<ReturnType<typeof getRestaurantFromSlug>>;
    try {
      restaurant = await getRestaurantFromSlug(restaurantSlug);
    } catch {
      return NextResponse.json(
        { error: "Restaurant not found or not active." },
        { status: 404 }
      );
    }

    const db = getPrismaClient(restaurant.country as Country);

    // ── Validate table ───────────────────────────────────────────────────
    const table = await db.table.findUnique({
      where: {
        restaurantId_number: {
          restaurantId: restaurant.id,
          number:       tableNumber,
        },
      },
      select: {
        id:           true,
        mergedIntoId: true,
        waiter: {
          select: {
            id:       true,
            name:     true,
            avatar:   true,
            greeting: true,
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

    // ── If merged, resolve to primary table for the session ──────────────
    let effectiveTableId = table.id;
    let effectiveWaiter  = table.waiter;

    if (table.mergedIntoId) {
      const primary = await db.table.findUnique({
        where:  { id: table.mergedIntoId },
        select: {
          id:     true,
          waiter: { select: { id: true, name: true, avatar: true, greeting: true } },
        },
      });
      if (primary) {
        effectiveTableId = primary.id;
        effectiveWaiter  = primary.waiter ?? effectiveWaiter;
      }
    }

    // ── Guard: if primary already has an active session, join it ─────────
    // Demo restaurant is exempt: each visitor gets their own private session
    // so multiple prospects can try the customer experience independently.
    const existing = restaurant.isPublicDemo
      ? null
      : await db.tableSession.findFirst({
          where:  { tableId: effectiveTableId, endedAt: null },
          select: { id: true },
        });
    if (existing) {
      // For merged tables: multiple people scanning join the same session
      return NextResponse.json({
        sessionId: existing.id,
        waiter:    effectiveWaiter ?? null,
      });
    }

    // ── Create session + mark primary table occupied (transaction) ────────
    const [session] = await db.$transaction([
      db.tableSession.create({
        data: {
          restaurantId: restaurant.id,
          tableId:      effectiveTableId,
        },
        select: { id: true },
      }),
      db.table.update({
        where: { id: effectiveTableId },
        data:  { status: "occupied" },
      }),
    ]);

    return NextResponse.json({
      sessionId: session.id,
      waiter:    effectiveWaiter ?? null,
    });
  } catch (error) {
    console.error("[POST /api/sessions]", error);
    return NextResponse.json({ error: "Failed to create session." }, { status: 500 });
  }
}

/**
 * GET /api/sessions?sessionId=<id>
 * Public endpoint — returns game status for a given session.
 * Used by the customer games page to check if orders exist and if spin was used.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required." }, { status: 400 });
    }

    const sessionSelect = {
      gamePlayUsed: true,
      discount:     true,
      endedAt:      true,
      orders:       { select: { id: true }, take: 1 },
    } as const;

    let session = await prismaCA.tableSession.findUnique({ where: { id: sessionId }, select: sessionSelect });
    if (!session) {
      session = await prismaDE.tableSession.findUnique({ where: { id: sessionId }, select: sessionSelect });
    }

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json({
      gamePlayUsed: session.gamePlayUsed,
      discount:     session.discount,
      hasOrders:    session.orders.length > 0,
      isActive:     session.endedAt === null,
    });
  } catch (error) {
    console.error("[GET /api/sessions]", error);
    return NextResponse.json({ error: "Failed to fetch session." }, { status: 500 });
  }
}
