import { getRequiredSession } from "@/lib/auth";
import { redirect } from "next/navigation";


import { prisma } from "@/lib/db";
import { DollarSign, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getData() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const restaurants = await prisma.restaurant.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id:    true,
      name:  true,
      slug:  true,
      status:true,
      tier:  { select: { name: true, monthlyPrice: true, id: true } },
      apiUsage: {
        where:  { date: { gte: monthStart } },
        select: { cost: true, tokensUsed: true },
      },
      _count: { select: { orders: true } },
    },
  });

  const tiers = await prisma.subscriptionTier.findMany({ orderBy: { monthlyPrice: "asc" } });

  const rows = restaurants.map((r) => {
    const apiCost    = r.apiUsage.reduce((s, u) => s + u.cost, 0);
    const totalTokens = r.apiUsage.reduce((s, u) => s + u.tokensUsed, 0);
    return {
      id:           r.id,
      name:         r.name,
      slug:         r.slug,
      status:       r.status,
      tierId:       r.tier?.id ?? null,
      tierName:     r.tier?.name ?? "None",
      monthlyPrice: r.tier?.monthlyPrice ?? 0,
      apiCostMonth: apiCost,
      totalTokens,
      totalRevenue: (r.tier?.monthlyPrice ?? 0) + apiCost,
      orderCount:   r._count.orders,
    };
  });

  const platformTotal = rows.reduce((s, r) => s + r.totalRevenue, 0);

  return { rows: JSON.parse(JSON.stringify(rows)), tiers: JSON.parse(JSON.stringify(tiers)), platformTotal };
}

function statusBadge(status: string) {
  switch (status) {
    case "active":    return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":   return "border-amber-200 bg-amber-500/15 text-amber-700";
    case "suspended": return "border-red-200 bg-red-50 text-red-600";
    case "disabled":  return "border-sa-border bg-white/5 text-sa-muted";
    default:          return "border-sa-border bg-white/5 text-sa-muted";
  }
}

export default async function BillingPage() {
  const session = await getRequiredSession();
  if (!session || session.user.role !== "super_admin") redirect("/auth/login");

  const { rows, tiers, platformTotal } = await getData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-sa-text">Billing</h1>
        <p className="mt-1 text-sm text-sa-muted">Monthly revenue breakdown per restaurant</p>
      </div>

      {/* Platform total */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Platform Revenue",
            value: `$${platformTotal.toFixed(2)}`,
            sub:   "subscriptions + API",
            icon:  DollarSign,
            color: "bg-blue-500/15 text-blue-600",
          },
          {
            label: "Active Restaurants",
            value: rows.filter((r: { status: string }) => r.status === "active").length,
            icon:  CheckCircle2,
            color: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Subscription Revenue",
            value: `$${rows.reduce((s: number, r: { monthlyPrice: number }) => s + r.monthlyPrice, 0).toFixed(2)}`,
            icon:  DollarSign,
            color: "bg-sa-accent/10 text-sa-accent",
          },
          {
            label: "API Cost This Month",
            value: `$${rows.reduce((s: number, r: { apiCostMonth: number }) => s + r.apiCostMonth, 0).toFixed(4)}`,
            icon:  AlertCircle,
            color: "bg-violet-50 text-violet-600",
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-sa-border bg-sa-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-sa-muted">{label}</p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-sa-text">{value}</p>
              {sub && <p className="mt-0.5 text-xs text-sa-muted">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Tier summary */}
      <div className="rounded-2xl border border-sa-border bg-sa-surface p-5 space-y-4">
        <h2 className="font-display text-base font-semibold text-sa-text">Subscription Tiers</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {tiers.map((tier: { id: string; name: string; monthlyPrice: number; maxTables: number; maxWaiters: number }) => {
            const count = rows.filter((r: { tierId: string | null }) => r.tierId === tier.id).length;
            return (
              <div key={tier.id} className="rounded-xl border border-sa-border bg-sa-bg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sa-text">{tier.name}</p>
                  <span className="rounded-full bg-sa-accent/10 border border-sa-accent/20 px-2 py-0.5 text-xs font-semibold text-sa-accent">
                    {count} restaurant{count !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="font-display text-xl font-bold text-sa-text">${tier.monthlyPrice}/mo</p>
                <p className="text-xs text-sa-muted">
                  {tier.maxTables === -1 ? "Unlimited" : tier.maxTables} tables · {tier.maxWaiters === -1 ? "Unlimited" : tier.maxWaiters} waiters
                </p>
                <p className="text-xs font-semibold text-sa-muted">
                  MRR: ${(count * tier.monthlyPrice).toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-restaurant table */}
      <div className="rounded-2xl border border-sa-border bg-sa-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-sa-border">
          <h2 className="font-display text-base font-semibold text-sa-text">Per Restaurant</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sa-border bg-sa-bg/50">
                {["Restaurant", "Status", "Tier", "Subscription", "API Cost", "Total", "Orders"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-sa-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-sa-border">
              {rows.map((row: { id: string; name: string; slug: string; status: string; tierName: string; monthlyPrice: number; apiCostMonth: number; totalRevenue: number; orderCount: number }) => (
                <tr key={row.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/super-admin/restaurants/${row.id}`} className="font-medium text-sa-text hover:text-sa-accent transition-colors">
                      {row.name}
                    </Link>
                    <p className="text-xs text-sa-muted">{row.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusBadge(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sa-muted">{row.tierName}</td>
                  <td className="px-4 py-3 font-medium text-sa-text">${row.monthlyPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sa-muted">${row.apiCostMonth.toFixed(4)}</td>
                  <td className="px-4 py-3 font-semibold text-sa-accent">${row.totalRevenue.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sa-muted">{row.orderCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
