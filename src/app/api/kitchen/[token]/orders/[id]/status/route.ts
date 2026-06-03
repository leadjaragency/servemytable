export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveKitchenRestaurant } from "@/lib/kitchen";

type Ctx = { params: Promise<{ token: string; id: string }> };

// Status pipeline: received → preparing → ready → served
const STATUS_ORDER = ["received", "preparing", "ready", "served"] as const;
type OrderStatus = (typeof STATUS_ORDER)[number];

const PatchStatusSchema = z.object({ status: z.enum(STATUS_ORDER) });

// ---------------------------------------------------------------------------
// PATCH /api/kitchen/[token]/orders/[id]/status
// Public (token-gated). Advances an order's status from the kitchen display.
// Forward-only; on "served" the table moves to billing (mirrors admin route).
// ---------------------------------------------------------------------------

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { token, id } = await params;
    const resolved = await resolveKitchenRestaurant(token);
    if (!resolved) {
      return NextResponse.json({ error: "Invalid kitchen link." }, { status: 404 });
    }
    const { db, restaurant } = resolved;

    const existing = await db.order.findUnique({
      where: { id },
      select: { restaurantId: true, status: true, tableId: true },
    });
    if (!existing || existing.restaurantId !== restaurant.id) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const body = await req.json();
    const parsed = PatchStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid status." },
        { status: 400 }
      );
    }

    const newStatus = parsed.data.status;
    const curIdx = STATUS_ORDER.indexOf(existing.status as OrderStatus);
    const nextIdx = STATUS_ORDER.indexOf(newStatus);
    if (nextIdx < curIdx) {
      return NextResponse.json(
        { error: `Cannot move order back from "${existing.status}" to "${newStatus}".` },
        { status: 400 }
      );
    }

    const updated = await db.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: { status: newStatus },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          tableId: true,
          updatedAt: true,
        },
      });

      if (newStatus === "served") {
        const otherActive = await tx.order.count({
          where: {
            tableId: existing.tableId,
            id: { not: id },
            status: { in: ["received", "preparing", "ready"] },
          },
        });
        if (otherActive === 0) {
          await tx.table.update({
            where: { id: existing.tableId },
            data: { status: "billing" },
          });
        }
      }

      return order;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/kitchen/[token]/orders/[id]/status]", error);
    return NextResponse.json({ error: "Failed to update status." }, { status: 500 });
  }
}
