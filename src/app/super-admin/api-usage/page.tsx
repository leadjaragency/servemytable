import { getRequiredSession } from "@/lib/auth";
import { redirect } from "next/navigation";


import { prisma } from "@/lib/db";
import { Zap, DollarSign, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

async function getData() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(todayStart.getTime() - 6 * 86_400_000);

  const restaurants = await prisma.restaurant.findMany({
    where:   { status: "active" },
    orderBy: { name: "asc" },
    select: {
      id:   true,
      name: true,
      slug: true,
      apiUsage: {
        select: { cost: true, tokensUsed: true, date: true, endpoint: true },
      },
    },
  });

  const rows = restaurants.map((r) => {
    const all     = r.apiUsage;
    const today   = all.filter((u) => new Date(u.date) >= todayStart);
    const week    = all.filter((u) => new Date(u.date) >= weekAgo);
    return {
      id:          r.id,
      name:        r.name,
      callsTotal:  all.length,
      callsToday:  today.length,
      callsWeek:   week.length,
      tokensTotal: all.reduce((s, u) => s + u.tokensUsed, 0),
      tokensToday: today.reduce((s, u) => s + u.tokensUsed, 0),
      costTotal:   all.reduce((s, u) => s + u.cost, 0),
      costToday:   today.reduce((s, u) => s + u.cost, 0),
      costWeek:    week.reduce((s, u) => s + u.cost, 0),
    };
  });

  const platformTokensToday = rows.reduce((s, r) => s + r.tokensToday, 0);
  const platformCostToday   = rows.reduce((s, r) => s + r.costToday, 0);
  const platformCostTotal   = rows.reduce((s, r) => s + r.costTotal, 0);
  const platformCallsToday  = rows.reduce((s, r) => s + r.callsToday, 0);

  return { rows: JSON.parse(JSON.stringify(rows)), platformTokensToday, platformCostToday, platformCostTotal, platformCallsToday };
}

export default async function ApiUsagePage() {
  const session = await getRequiredSession();
  if (!session || session.user.role !== "super_admin") redirect("/auth/login");

  const { rows, platformTokensToday, platformCostToday, platformCostTotal, platformCallsToday } = await getData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-sa-text">API Usage</h1>
        <p className="mt-1 text-sm text-sa-muted">Anthropic Claude API consumption per restaurant</p>
      </div>

      {/* Platform totals */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "API Calls Today",   value: platformCallsToday,                  icon: Activity,    color: "bg-blue-500/15 text-blue-600" },
          { label: "Tokens Today",      value: platformTokensToday.toLocaleString(), icon: Zap,         color: "bg-sa-accent/10 text-sa-accent" },
          { label: "Cost Today",        value: `$${platformCostToday.toFixed(4)}`,   icon: DollarSign,  color: "bg-amber-500/15 text-amber-600" },
          { label: "Total API Cost",    value: `$${platformCostTotal.toFixed(4)}`,   icon: DollarSign,  color: "bg-violet-50 text-violet-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-sa-border bg-sa-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-sa-muted">{label}</p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-sa-text">{value}</p>
          </div>
        ))}
      </div>

      {/* Note about API usage */}
      <div className="rounded-xl border border-sa-border bg-sa-surface/50 px-4 py-3">
        <p className="text-sm text-sa-muted">
          <span className="font-medium text-sa-text">Demo Mode:</span>
          {" "}API usage is tracked per chat request in <code className="text-xs bg-sa-border/30 px-1 py-0.5 rounded">APIUsageLog</code>.
          Costs use estimated Sonnet pricing ($3/1M input, $15/1M output tokens).
        </p>
      </div>

      {/* Per-restaurant table */}
      <div className="rounded-2xl border border-sa-border bg-sa-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-sa-border">
          <h2 className="font-display text-base font-semibold text-sa-text">Usage by Restaurant</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sa-border bg-sa-bg/50">
                {["Restaurant", "Calls Today", "Calls (7d)", "Tokens Today", "Cost Today", "Cost (7d)", "Total Cost"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-sa-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-sa-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sa-muted">No API usage recorded yet.</td>
                </tr>
              ) : rows.map((row: {
                id: string;
                name: string;
                callsToday: number;
                callsWeek: number;
                tokensToday: number;
                costToday: number;
                costWeek: number;
                costTotal: number;
              }) => (
                <tr key={row.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-sa-text">{row.name}</td>
                  <td className="px-4 py-3 text-sa-muted">{row.callsToday}</td>
                  <td className="px-4 py-3 text-sa-muted">{row.callsWeek}</td>
                  <td className="px-4 py-3 text-sa-muted">{row.tokensToday.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sa-muted">${row.costToday.toFixed(4)}</td>
                  <td className="px-4 py-3 text-sa-muted">${row.costWeek.toFixed(4)}</td>
                  <td className="px-4 py-3 font-semibold text-sa-accent">${row.costTotal.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
