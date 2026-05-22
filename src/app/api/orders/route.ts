import { getRequiredSession, getPrismaForSession, getRestaurantFromSlug } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrismaClient } from "@/lib/db";
import type { Country, AppSession } from "@/types";


export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/orders
// Optional query params:
//   ?status=received,preparing   — comma-separated filter
//   ?tableId=<id>               — filter by table
//   ?limit=50                   — default 50, max 200
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  try {
    const session = await getRequiredSession();
    if (!session?.user.restaurantId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const restaurantId = session.user.restaurantId;
    const db = getPrismaForSession(session);

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const tableId     = searchParams.get("tableId");
    const limit       = Math.min(Number(searchParams.get("limit") ?? "100"), 200);

    const statuses = statusParam
      ? statusParam.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const orders = await db.order.findMany({
      where: {
        restaurantId,
        ...(statuses  ? { status:  { in: statuses }  } : {}),
        ...(tableId   ? { tableId }                    : {}),
      },
      orderBy: { createdAt: "desc" },
      take:    limit,
      include: {
        table: { select: { id: true, number: true, seats: true } },
        items: {
          include: {
            dish: {
              select: {
                id:          true,
                name:        true,
                allergens:   true,
                imageEmoji:  true,
                isVeg:       true,
                isVegan:     true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("[GET /api/orders]", error);
    return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/orders — place a new order (customer or admin)
// Body: { tableId, sessionId, items: [{ dishId, quantity, specialInst? }], specialNotes?, discount? }
// ---------------------------------------------------------------------------

const OrderItemInputSchema = z.object({
  dishId:      z.string().min(1),
  quantity:    z.coerce.number().int().positive(),
  specialInst: z.string().max(300).optional().nullable(),
});

const CreateOrderSchema = z.object({
  tableId:        z.string().min(1),
  sessionId:      z.string().min(1),
  restaurantSlug: z.string().optional(),
  items:          z.array(OrderItemInputSchema).min(1, "At least one item required"),
  specialNotes:   z.string().max(500).optional().nullable(),
  discount:       z.coerce.number().min(0).optional().default(0),
});

export async function POST(req: Request) {
  try {
    // Support both admin session and public (customer) access via restaurantSlug.
    // getRequiredSession throws for unauthenticated users, so we catch and allow null.
    let session: AppSession | null = null;
    try { session = await getRequiredSession(); } catch { /* customer — no auth */ }

    const body         = await req.json();
    const parsed       = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data." },
        { status: 400 }
      );
    }

    const { tableId, sessionId, restaurantSlug, items, specialNotes, discount } = parsed.data;

    // Resolve restaurantId + db client
    let restaurantId: string;
    let db: ReturnType<typeof getPrismaClient>;

    if (session?.user.restaurantId) {
      restaurantId = session.user.restaurantId;
      db = getPrismaForSession(session);
    } else if (restaurantSlug) {
      // Customer: use slug to find correct schema
      const restaurant = await getRestaurantFromSlug(restaurantSlug);
      restaurantId = restaurant.id;
      db = getPrismaClient(restaurant.country as Country);
    } else {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Verify table belongs to restaurant
    const table = await db.table.findUnique({
      where:  { id: tableId },
      select: { id: true, restaurantId: true, number: true },
    });
    if (!table || table.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Invalid table." }, { status: 400 });
    }

    // Verify session belongs to restaurant + table
    const tableSession = await db.tableSession.findUnique({
      where:  { id: sessionId },
      select: { id: true, restaurantId: true, tableId: true, endedAt: true },
    });
    if (
      !tableSession ||
      tableSession.restaurantId !== restaurantId ||
      tableSession.tableId !== tableId
    ) {
      return NextResponse.json({ error: "Invalid session." }, { status: 400 });
    }

    // Fetch all dishes to validate and get prices
    const dishIds = [...new Set(items.map((i) => i.dishId))];
    const dishes  = await db.dish.findMany({
      where:  { id: { in: dishIds }, restaurantId, isAvailable: true },
      select: { id: true, price: true, name: true },
    });

    if (dishes.length !== dishIds.length) {
      return NextResponse.json(
        { error: "One or more dishes are unavailable or not found." },
        { status: 400 }
      );
    }

    const dishMap = Object.fromEntries(dishes.map((d) => [d.id, d]));

    // Calculate totals
    const restaurant = await db.restaurant.findUnique({
      where:  { id: restaurantId },
      select: { taxRate: true, slug: true },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
    }

    const subtotal  = items.reduce((sum, item) => sum + dishMap[item.dishId].price * item.quantity, 0);
    const tax       = +(subtotal * restaurant.taxRate).toFixed(2);
    const discAmt   = +(discount ?? 0);
    const total     = +(subtotal + tax - discAmt).toFixed(2);

    // Generate order number: SLUG_PREFIX-NNNN (e.g. SP-0007)
    const prefix     = restaurant.slug.split("-").map((w) => w[0].toUpperCase()).join("").slice(0, 3);
    const orderCount = await db.order.count({ where: { restaurantId } });
    const orderNumber = `${prefix}-${String(orderCount + 1).padStart(4, "0")}`;

    // Create order + items + update table status in a transaction
    const order = await db.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          restaurantId,
          tableId,
          sessionId,
          orderNumber,
          subtotal: +subtotal.toFixed(2),
          tax,
          discount: discAmt,
          total,
          status:       "received",
          specialNotes: specialNotes ?? null,
          items: {
            create: items.map((item) => ({
              dishId:      item.dishId,
              quantity:    item.quantity,
              unitPrice:   dishMap[item.dishId].price,
              specialInst: item.specialInst ?? null,
            })),
          },
        },
        include: {
          table: { select: { id: true, number: true, seats: true } },
          items: {
            include: {
              dish: { select: { id: true, name: true, allergens: true, imageEmoji: true } },
            },
          },
        },
      });

      // Update table status to "ordering"
      await tx.table.update({
        where: { id: tableId },
        data:  { status: "ordering" },
      });

      return newOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("[POST /api/orders]", error);
    return NextResponse.json({ error: "Failed to place order." }, { status: 500 });
  }
}
