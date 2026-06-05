import Link from "next/link";
import {
  Building2,
  ShoppingBag,
  TrendingUp,
  Zap,
  Store,
  Star,
  ArrowRight,
  AlertCircle,
  UtensilsCrossed,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { formatCurrency, formatTimeAgo } from "@/lib/utils";

async function getDashboardData() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    activeRestaurantCount,
    pendingCount,
    ordersToday,
    activeRestaurantsWithTier,
    apiCostResult,
    recentSignups,
    recentOrders,
    recentReviews,
  ] = await Promise.all([
    prisma.restaurant.count({ where: { status: "active" } }),
    prisma.restaurant.count({ where: { status: "pending" } }),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.restaurant.findMany({
      where: { status: "active" },
      select: { tier: { select: { monthlyPrice: true } } },
    }),
    prisma.aPIUsageLog.aggregate({
      where: { date: { gte: todayStart } },
      _sum: { cost: true },
    }),
    prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, cuisine: true, status: true, createdAt: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        createdAt: true,
        restaurant: { select: { name: true } },
        table: { select: { number: true } },
      },
    }),
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        restaurant: { select: { name: true } },
      },
    }),
  ]);

  const mrr = activeRestaurantsWithTier.reduce(
    (sum, r) => sum + (r.tier?.monthlyPrice ?? 0),
    0
  );
  const apiCost = apiCostResult._sum.cost ?? 0;

  type EventType = "signup" | "order" | "review";
  interface ActivityItem {
    id: string;
    type: EventType;
    title: string;
    meta: string;
    timestamp: Date;
  }

  const activities: ActivityItem[] = [
    ...recentSignups.map((r) => ({
      id: `signup-${r.id}`,
      type: "signup" as EventType,
      title: `${r.name} signed up`,
      meta: `${r.cuisine} · ${r.status}`,
      timestamp: r.createdAt,
    })),
    ...recentOrders.map((o) => ({
      id: `order-${o.id}`,
      type: "order" as EventType,
      title: `Order #${o.orderNumber}`,
      meta: `Table ${o.table.number} · ${o.restaurant.name} · ${formatCurrency(o.total)}`,
      timestamp: o.createdAt,
    })),
    ...recentReviews.map((r) => ({
      id: `review-${r.id}`,
      type: "review" as EventType,
      title: `${r.rating}★ review`,
      meta: `${r.restaurant.name}${r.comment ? ` — "${r.comment.slice(0, 60)}${r.comment.length > 60 ? "…" : ""}"` : ""}`,
      timestamp: r.createdAt,
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);

  return { activeRestaurantCount, pendingCount, ordersToday, mrr, apiCost, activities };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  delay?: number;
}

function StatCard({ title, value, subtitle, icon: Icon, iconBg, iconColor, borderColor, delay = 0 }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 animate-fade-in"
      style={{
        background: "#1A1A1A",
        border: `1px solid #2A2A2A`,
        borderTop: `3px solid ${borderColor}`,
        animationDelay: `${delay}ms`,
        animationFillMode: "both",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#AD897E" }}>
          {title}
        </p>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: iconBg }}
        >
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-3xl font-bold tabular-nums leading-none" style={{ color: "#FAF6ED" }}>
        {value}
      </p>
      <p className="text-xs leading-snug" style={{ color: "#94A3B8" }}>{subtitle}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity config
// ---------------------------------------------------------------------------

const ACTIVITY_CONFIG = {
  signup:  { icon: Store,       bg: "#EFF6FF", color: "#FF4D00" },
  order:   { icon: ShoppingBag, bg: "#F0FDF4", color: "#16A34A" },
  review:  { icon: Star,        bg: "#FFFBEB", color: "#D97706" },
} as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SuperAdminOverview() {
  const { activeRestaurantCount, pendingCount, ordersToday, mrr, apiCost, activities } =
    await getDashboardData();

  const greeting = getGreeting();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">

      {/* ── Greeting ── */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold" style={{ color: "#FAF6ED" }}>
          {greeting}, Platform Admin 👋
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#AD897E" }}>
          Here&apos;s what&apos;s happening across your platform today.
        </p>
      </div>

      {/* ── Pending banner ── */}
      {pendingCount > 0 && (
        <Link
          href="/super-admin/approvals"
          className="flex items-center justify-between gap-4 rounded-xl px-5 py-4 transition-all hover:opacity-90 animate-fade-in"
          style={{
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
          }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 shrink-0" style={{ color: "#FF4D00" }} />
            <p className="text-sm font-medium" style={{ color: "#1E40AF" }}>
              {pendingCount} restaurant application{pendingCount > 1 ? "s" : ""} waiting for your approval
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold" style={{ color: "#FF4D00" }}>
            Review now <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active Restaurants"
          value={activeRestaurantCount.toString()}
          subtitle={pendingCount > 0 ? `+${pendingCount} pending approval` : "All restaurants operational"}
          icon={Building2}
          iconBg="#EFF6FF"
          iconColor="#FF4D00"
          borderColor="#FF4D00"
          delay={0}
        />
        <StatCard
          title="Orders Today"
          value={ordersToday.toLocaleString()}
          subtitle="Across all restaurants"
          icon={ShoppingBag}
          iconBg="#F0FDF4"
          iconColor="#16A34A"
          borderColor="#10B981"
          delay={60}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(mrr)}
          subtitle="Sum of active subscription tiers"
          icon={TrendingUp}
          iconBg="#FFFBEB"
          iconColor="#D97706"
          borderColor="#F59E0B"
          delay={120}
        />
        <StatCard
          title="API Cost Today"
          value={formatCurrency(apiCost)}
          subtitle="Anthropic Claude usage"
          icon={Zap}
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          borderColor="#EF4444"
          delay={180}
        />
      </div>

      {/* ── Activity + Quick actions ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Activity feed */}
        <div
          className="lg:col-span-2 rounded-xl overflow-hidden animate-fade-in"
          style={{
            background: "#1A1A1A",
            border: "1px solid #2A2A2A",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            animationDelay: "240ms",
            animationFillMode: "both",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid #201F1F" }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "#FAF6ED" }}>
              Recent Activity
            </h2>
            <div className="flex items-center gap-4 text-[11px]" style={{ color: "#94A3B8" }}>
              {(["signup", "order", "review"] as const).map((type) => (
                <span key={type} className="flex items-center gap-1.5 capitalize">
                  <span
                    className="h-2 w-2 rounded-full inline-block"
                    style={{ background: ACTIVITY_CONFIG[type].color }}
                  />
                  {type}
                </span>
              ))}
            </div>
          </div>

          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <UtensilsCrossed className="h-8 w-8" style={{ color: "#2A2A2A" }} />
              <p className="text-sm" style={{ color: "#94A3B8" }}>
                No activity yet. Place orders or sign up restaurants to see events here.
              </p>
            </div>
          ) : (
            <ul>
              {activities.map((item, idx) => {
                const cfg = ACTIVITY_CONFIG[item.type];
                const Icon = cfg.icon;
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-4 px-5 py-3.5 transition-colors hover:bg-white/5"
                    style={{
                      borderBottom: idx < activities.length - 1 ? "1px solid #0A0A0A" : "none",
                    }}
                  >
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: cfg.bg }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug" style={{ color: "#FAF6ED" }}>
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs" style={{ color: "#94A3B8" }}>
                        {item.meta}
                      </p>
                    </div>
                    <p className="shrink-0 text-[11px] tabular-nums" style={{ color: "#2A2A2A" }}>
                      {formatTimeAgo(item.timestamp)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="px-5 py-3" style={{ borderTop: "1px solid #201F1F" }}>
            <Link
              href="/super-admin/restaurants"
              className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-70"
              style={{ color: "#FF4D00" }}
            >
              View all restaurants <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Quick actions */}
        <div
          className="flex flex-col gap-2.5 animate-fade-in"
          style={{ animationDelay: "300ms", animationFillMode: "both" }}
        >
          <h2 className="text-sm font-semibold px-0.5 mb-1" style={{ color: "#FAF6ED" }}>
            Quick Actions
          </h2>

          {[
            {
              label: "Manage Restaurants",
              desc: "View, edit, and control restaurants",
              href: "/super-admin/restaurants",
              icon: Building2,
              badge: 0,
              iconBg: "#EFF6FF",
              iconColor: "#FF4D00",
            },
            {
              label: "Review Approvals",
              desc: "Approve or reject new signups",
              href: "/super-admin/approvals",
              icon: AlertCircle,
              badge: pendingCount,
              iconBg: "#FEF2F2",
              iconColor: "#DC2626",
            },
            {
              label: "Billing Overview",
              desc: "Tier assignments and revenue",
              href: "/super-admin/billing",
              icon: TrendingUp,
              badge: 0,
              iconBg: "#FFFBEB",
              iconColor: "#D97706",
            },
            {
              label: "API Usage",
              desc: "Claude token and cost tracking",
              href: "/super-admin/api-usage",
              icon: Zap,
              badge: 0,
              iconBg: "#F0FDF4",
              iconColor: "#16A34A",
            },
            {
              label: "Analytics",
              desc: "Platform-wide stats and trends",
              href: "/super-admin/analytics",
              icon: Star,
              badge: 0,
              iconBg: "#F5F3FF",
              iconColor: "#7C3AED",
            },
          ].map(({ label, desc, href, icon: Icon, badge, iconBg, iconColor }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all hover:shadow-sm hover:border-sa-accent/40 bg-sa-surface"
              style={{
                border: "1px solid #2A2A2A",
                boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: iconBg }}
              >
                <Icon className="h-4 w-4" style={{ color: iconColor }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate" style={{ color: "#FAF6ED" }}>
                    {label}
                  </p>
                  {badge > 0 && (
                    <span
                      className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                      style={{ background: "#DC2626" }}
                    >
                      {badge}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] truncate" style={{ color: "#94A3B8" }}>
                  {desc}
                </p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#FF4D00" }} />
            </Link>
          ))}

          {/* Platform status */}
          <div
            className="mt-1 flex items-center gap-2.5 rounded-xl px-4 py-3"
            style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" style={{ background: "#10B981" }} />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: "#10B981" }} />
            </span>
            <p className="text-xs font-medium" style={{ color: "#15803D" }}>
              Platform operational · All systems normal
            </p>
            <ChevronRight className="ml-auto h-3 w-3 shrink-0" style={{ color: "#16A34A" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
