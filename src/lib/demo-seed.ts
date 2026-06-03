import { prisma } from "@/lib/db";

/**
 * Resets the public demo restaurant to a clean, freshly-populated state.
 *
 * Scope is strictly limited to the single restaurant flagged `isPublicDemo`,
 * so this can never touch any other tenant's data. It wipes all transactional
 * rows (orders, sessions, chats, reviews, games), resets table statuses, then
 * re-seeds a small, realistic set of live orders + reviews so the demo always
 * looks active. Menu / tables / waiters (config) are left untouched.
 *
 * Called by the daily cron (`/api/cron/demo-reset`) and reusable on demand.
 */

/**
 * True when the given restaurant is the open public demo. Used to disable
 * actions that would compromise demo access (e.g. creating/removing auth users)
 * so the no-login auto-login keeps working.
 */
export async function isPublicDemoRestaurant(
  restaurantId: string | null | undefined
): Promise<boolean> {
  if (!restaurantId) return false;
  const r = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { isPublicDemo: true },
  });
  return !!r?.isPublicDemo;
}

const ago = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);

function orderPrefix(slug: string): string {
  return (
    slug
      .split("-")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 3) || "OR"
  );
}

export interface DemoResetResult {
  restaurantId: string;
  slug: string;
  ordersCreated: number;
  reviewsCreated: number;
}

export async function resetDemoData(): Promise<DemoResetResult | null> {
  const restaurant = await prisma.restaurant.findFirst({
    where: { isPublicDemo: true },
  });
  if (!restaurant) return null;

  const restaurantId = restaurant.id;

  // ── 1. Wipe transactional data (FK-safe order) ──────────────────────────
  const orders = await prisma.order.findMany({
    where: { restaurantId },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);
  if (orderIds.length > 0) {
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  }
  await prisma.order.deleteMany({ where: { restaurantId } });

  const sessions = await prisma.tableSession.findMany({
    where: { restaurantId },
    select: { id: true },
  });
  const sessionIds = sessions.map((s) => s.id);
  if (sessionIds.length > 0) {
    const chatSessions = await prisma.chatSession.findMany({
      where: { sessionId: { in: sessionIds } },
      select: { id: true },
    });
    const chatSessionIds = chatSessions.map((c) => c.id);
    if (chatSessionIds.length > 0) {
      await prisma.chatMessage.deleteMany({
        where: { chatSessionId: { in: chatSessionIds } },
      });
      await prisma.chatSession.deleteMany({
        where: { id: { in: chatSessionIds } },
      });
    }
  }

  await prisma.review.deleteMany({ where: { restaurantId } });
  await prisma.gameResult.deleteMany({ where: { restaurantId } });
  await prisma.tableSession.deleteMany({ where: { restaurantId } });

  // ── 2. Reset all tables to empty ────────────────────────────────────────
  await prisma.table.updateMany({
    where: { restaurantId },
    data: { status: "empty" },
  });

  // ── 3. Re-seed a small set of fresh orders + reviews ────────────────────
  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: { number: "asc" },
  });
  const dishes = await prisma.dish.findMany({
    where: { restaurantId, isAvailable: true },
    orderBy: { createdAt: "asc" },
    take: 12,
  });

  if (tables.length === 0 || dishes.length === 0) {
    return { restaurantId, slug: restaurant.slug, ordersCreated: 0, reviewsCreated: 0 };
  }

  const prefix = orderPrefix(restaurant.slug);
  const taxRate = restaurant.taxRate ?? 0.08;
  const pick = (i: number) => dishes[i % dishes.length];

  // Four live orders spanning the kitchen pipeline
  const orderPlan: { tableIdx: number; status: string; minsAgo: number; items: { dishIdx: number; qty: number }[] }[] = [
    { tableIdx: 0, status: "received",  minsAgo: 4,  items: [{ dishIdx: 0, qty: 2 }, { dishIdx: 1, qty: 1 }] },
    { tableIdx: 1, status: "preparing", minsAgo: 12, items: [{ dishIdx: 2, qty: 1 }, { dishIdx: 3, qty: 2 }, { dishIdx: 4, qty: 1 }] },
    { tableIdx: 2, status: "ready",     minsAgo: 20, items: [{ dishIdx: 5, qty: 3 }] },
    { tableIdx: 3, status: "served",    minsAgo: 38, items: [{ dishIdx: 6, qty: 1 }, { dishIdx: 7, qty: 2 }] },
  ];

  let ordersCreated = 0;
  for (let i = 0; i < orderPlan.length; i++) {
    const plan = orderPlan[i];
    const table = tables[plan.tableIdx % tables.length];

    const lineItems = plan.items.map((it) => {
      const dish = pick(it.dishIdx);
      return { dishId: dish.id, unitPrice: dish.price, quantity: it.qty };
    });
    const subtotal = +lineItems.reduce((s, it) => s + it.unitPrice * it.quantity, 0).toFixed(2);
    const tax = +(subtotal * taxRate).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);

    const session = await prisma.tableSession.create({
      data: {
        restaurantId,
        tableId: table.id,
        guestCount: 2 + (i % 3),
        dietaryPrefs: [],
        startedAt: ago(plan.minsAgo + 5),
      },
    });

    await prisma.order.create({
      data: {
        restaurantId,
        orderNumber: `${prefix}-${String(i + 1).padStart(4, "0")}`,
        tableId: table.id,
        sessionId: session.id,
        subtotal,
        tax,
        total,
        status: plan.status,
        createdAt: ago(plan.minsAgo),
        items: { create: lineItems },
      },
    });

    // Reflect active tables in the floor plan
    if (plan.status !== "served") {
      await prisma.table.update({
        where: { id: table.id },
        data: { status: "ordering" },
      });
    }
    ordersCreated++;
  }

  // Two past reviews on their own ended sessions
  const reviewPlan = [
    { rating: 5, comment: "Incredible flavors and the AI waiter was so helpful!" },
    { rating: 4, comment: "Great food, quick service. Will be back." },
  ];
  let reviewsCreated = 0;
  for (let i = 0; i < reviewPlan.length; i++) {
    const table = tables[(i + 4) % tables.length];
    const session = await prisma.tableSession.create({
      data: {
        restaurantId,
        tableId: table.id,
        guestCount: 2,
        dietaryPrefs: [],
        startedAt: ago(180 + i * 30),
        endedAt: ago(120 + i * 30),
      },
    });
    await prisma.review.create({
      data: {
        restaurantId,
        sessionId: session.id,
        rating: reviewPlan[i].rating,
        comment: reviewPlan[i].comment,
        createdAt: ago(120 + i * 30),
      },
    });
    reviewsCreated++;
  }

  return { restaurantId, slug: restaurant.slug, ordersCreated, reviewsCreated };
}
