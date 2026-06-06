import { getRequiredSession, getPrismaForSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import {
  LayoutGrid,
  ShoppingBag,
  DollarSign,
  Clock,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import type { PrismaClient } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getData(restaurantId: string, db: PrismaClient) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    tables,
    ordersToday,
    revenueAgg,
    activeOrders,
    aiWaiters,
  ] = await Promise.all([
    // All tables + occupancy
    db.table.findMany({
      where: { restaurantId },
      select: { id: true, number: true, status: true, seats: true, waiterId: true },
      orderBy: { number: "asc" },
    }),

    // Orders placed today
    db.order.findMany({
      where: { restaurantId, createdAt: { gte: todayStart } },
      select: { id: true, status: true, total: true, createdAt: true },
    }),

    // Revenue total today
    db.order.aggregate({
      where: { restaurantId, createdAt: { gte: todayStart } },
      _sum: { total: true },
    }),

    // Latest 5 non-served orders (received + preparing) with items
    db.order.findMany({
      where: {
        restaurantId,
        status: { in: ["received", "preparing", "ready"] },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        table: { select: { number: true } },
        items: {
          include: { dish: { select: { name: true, allergens: true } } },
        },
      },
    }),

    // AI waiters with table + chat session counts
    db.aIWaiter.findMany({
      where: { restaurantId },
      include: {
        _count: {
          select: {
            tables: true,
            chatSessions: { where: { createdAt: { gte: todayStart } } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // ── Derived stats ─────────────────────────────────────────────────────
  const activeTables     = tables.filter((t) => t.status !== "empty").length;
  const totalTables      = tables.length;
  const totalOrdersToday = ordersToday.length;
  const revenueToday     = revenueAgg._sum.total ?? 0;

  // Average wait time: minutes since createdAt for orders still "received" or "preparing"
  const inProgressOrders = activeOrders.filter((o) =>
    o.status === "received" || o.status === "preparing"
  );
  const avgWaitMs =
    inProgressOrders.length > 0
      ? inProgressOrders.reduce(
          (sum, o) => sum + (Date.now() - new Date(o.createdAt).getTime()),
          0
        ) / inProgressOrders.length
      : 0;
  const avgWaitMinutes = Math.round(avgWaitMs / 60_000);

  return {
    activeTables,
    totalTables,
    totalOrdersToday,
    revenueToday,
    avgWaitMinutes,
    activeOrders,
    aiWaiters,
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-ra-border bg-ra-surface p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-ra-muted">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <div>
        <p className="font-display text-3xl font-bold text-ra-text">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-ra-muted">{sub}</p>}
      </div>
    </div>
  );
}

type OrderWithDetails = Awaited<ReturnType<typeof getData>>["activeOrders"][number];

function statusLabel(status: string) {
  switch (status) {
    case "received":  return { label: "Received",  cls: "border-amber-500/30 bg-amber-500/10 text-amber-400" };
    case "preparing": return { label: "Preparing", cls: "border-blue-500/30  bg-blue-500/10  text-blue-400" };
    case "ready":     return { label: "Ready",     cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" };
    default:          return { label: status,      cls: "border-ra-border bg-ra-surface text-ra-muted" };
  }
}

function timeAgo(date: Date | string) {
  const ms = Date.now() - new Date(date).getTime();
  const m  = Math.floor(ms / 60_000);
  if (m < 1)  return "just now";
  if (m === 1) return "1 min ago";
  return `${m} mins ago`;
}

function OrderCard({ order }: { order: OrderWithDetails }) {
  const { label, cls } = statusLabel(order.status);
  const hasAllergens = order.items.some((i) => i.dish.allergens.length > 0);

  return (
    <div className="rounded-xl border border-ra-border bg-ra-bg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ra-accent/15 text-xs font-bold text-ra-accent">
            {order.table.number}
          </span>
          <span className="text-sm font-medium text-ra-text">Table {order.table.number}</span>
          {hasAllergens && (
            <span title="Allergens present">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
            {label}
          </span>
          <span className="text-xs text-ra-muted">{timeAgo(order.createdAt)}</span>
        </div>
      </div>

      {/* Items list */}
      <ul className="space-y-0.5">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between text-sm">
            <span className="text-ra-text/90">
              {item.quantity}× {item.dish.name}
            </span>
            {item.dish.allergens.length > 0 && (
              <span className="text-xs text-amber-400/80">
                {item.dish.allergens.slice(0, 2).join(", ")}
                {item.dish.allergens.length > 2 && " …"}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* Total */}
      <p className="text-xs text-ra-muted text-right font-medium">
        ${order.total.toFixed(2)}
      </p>
    </div>
  );
}

type Waiter = Awaited<ReturnType<typeof getData>>["aiWaiters"][number];

function WaiterStatusCard({ waiter }: { waiter: Waiter }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-ra-border bg-ra-bg px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ra-surface text-xl">
        {waiter.avatar}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-ra-text truncate">{waiter.name}</p>
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              waiter.isActive ? "bg-emerald-400" : "bg-ra-muted"
            }`}
          />
        </div>
        <p className="text-xs text-ra-muted capitalize truncate">{waiter.personality}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-ra-text">{waiter._count.tables}</p>
        <p className="text-xs text-ra-muted">tables</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-ra-text">{waiter._count.chatSessions}</p>
        <p className="text-xs text-ra-muted">chats</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminDashboardPage() {
  const session = await getRequiredSession();
  if (!session?.user.restaurantId) redirect("/auth/login");

  const db = getPrismaForSession(session);

  // First-run nudge: send freshly-approved owners to the setup wizard once,
  // unless they've chosen to skip it (cookie set by the wizard's "Skip for now").
  const skippedSetup = (await cookies()).get("smt_setup_skipped")?.value === "1";
  if (!skippedSetup) {
    const setupState = await db.restaurant.findUnique({
      where:  { id: session.user.restaurantId },
      select: { setupCompletedAt: true },
    });
    if (setupState && !setupState.setupCompletedAt) redirect("/admin/setup");
  }

  const t  = await getTranslations("admin.dashboard");

  const {
    activeTables,
    totalTables,
    totalOrdersToday,
    revenueToday,
    avgWaitMinutes,
    activeOrders,
    aiWaiters,
  } = await getData(session.user.restaurantId, db);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Auto-refresh every 10 s */}
      <AutoRefresh intervalMs={10_000} />

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ra-text">Dashboard</h1>
        <p className="mt-1 text-sm text-ra-muted">
          Live overview — auto-refreshes every 10 seconds
        </p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t("activeTables")}
          value={`${activeTables}/${totalTables}`}
          sub={`${totalTables - activeTables} empty`}
          icon={LayoutGrid}
          accent="bg-ra-accent/15 text-ra-accent"
        />
        <StatCard
          label={t("ordersToday")}
          value={totalOrdersToday}
          sub={`${activeOrders.length} in progress`}
          icon={ShoppingBag}
          accent="bg-blue-500/15 text-blue-400"
        />
        <StatCard
          label={t("revenueToday")}
          value={`$${revenueToday.toFixed(2)}`}
          sub="all completed orders"
          icon={DollarSign}
          accent="bg-emerald-500/15 text-emerald-400"
        />
        <StatCard
          label={t("avgWaitTime")}
          value={avgWaitMinutes > 0 ? `${avgWaitMinutes}m` : "—"}
          sub={avgWaitMinutes > 0 ? "for in-progress orders" : "no active orders"}
          icon={Clock}
          accent="bg-purple-500/15 text-purple-400"
        />
      </div>

      {/* ── Two-column: Live Orders + AI Waiters ────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Live Orders — 60% */}
        <section className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ra-text">
              Live Orders
            </h2>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1 text-xs font-medium text-ra-accent hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {activeOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ra-border py-16 text-center">
              <ShoppingBag className="h-8 w-8 text-ra-muted/40" />
              <div>
                <p className="text-sm font-medium text-ra-text">No active orders</p>
                <p className="text-xs text-ra-muted mt-0.5">
                  New orders will appear here automatically.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </section>

        {/* AI Waiters — 40% */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ra-text">
              AI Waiters
            </h2>
            <Link
              href="/admin/waiters"
              className="flex items-center gap-1 text-xs font-medium text-ra-accent hover:underline"
            >
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {aiWaiters.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ra-border py-16 text-center">
              <span className="text-3xl">🤖</span>
              <div>
                <p className="text-sm font-medium text-ra-text">No waiters yet</p>
                <p className="text-xs text-ra-muted mt-0.5">
                  Add your first AI waiter to get started.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {aiWaiters.map((w) => (
                <WaiterStatusCard key={w.id} waiter={w} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
