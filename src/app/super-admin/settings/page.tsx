import { getRequiredSession } from "@/lib/auth";
import { redirect } from "next/navigation";


import { prisma } from "@/lib/db";
import { Settings, Shield, Key } from "lucide-react";

export const dynamic = "force-dynamic";

async function getTiers() {
  return prisma.subscriptionTier.findMany({ orderBy: { monthlyPrice: "asc" } });
}

export default async function SuperAdminSettingsPage() {
  const session = await getRequiredSession();
  if (!session || session.user.role !== "super_admin") redirect("/auth/login");

  const tiers = await getTiers();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-sa-text">Platform Settings</h1>
        <p className="mt-1 text-sm text-sa-muted">Configure global platform defaults and integrations</p>
      </div>

      {/* Subscription tiers */}
      <section className="rounded-2xl border border-sa-border bg-sa-surface p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-sa-accent" />
          <h2 className="font-display text-base font-semibold text-sa-text">Subscription Tiers</h2>
        </div>
        <p className="text-sm text-sa-muted">Current tier configuration (read-only — update via database or future tier editor).</p>

        <div className="space-y-3">
          {tiers.map((tier) => {
            const features = tier.features as Record<string, boolean | string>;
            return (
              <div key={tier.id} className="rounded-xl border border-sa-border bg-sa-bg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sa-text">{tier.name}</p>
                    <p className="text-xs text-sa-muted font-mono">{tier.id}</p>
                  </div>
                  <p className="font-display text-xl font-bold text-sa-accent">${tier.monthlyPrice}/mo</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-sa-muted sm:grid-cols-4">
                  <div>
                    <span className="font-medium text-sa-text">Tables: </span>
                    {tier.maxTables === -1 ? "Unlimited" : tier.maxTables}
                  </div>
                  <div>
                    <span className="font-medium text-sa-text">Waiters: </span>
                    {tier.maxWaiters === -1 ? "Unlimited" : tier.maxWaiters}
                  </div>
                  <div>
                    <span className="font-medium text-sa-text">Team: </span>
                    {tier.maxTeamMembers === -1 ? "Unlimited" : tier.maxTeamMembers}
                  </div>
                  <div>
                    <span className="font-medium text-sa-text">Active: </span>
                    {tier.isActive ? "Yes" : "No"}
                  </div>
                </div>
                {features && Object.keys(features).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(features).map(([key, val]) => (
                      <span key={key} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        val === true
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-sa-border bg-white/5 text-sa-muted"
                      }`}>
                        {key}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* API Key */}
      <section className="rounded-2xl border border-sa-border bg-sa-surface p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-sa-accent" />
          <h2 className="font-display text-base font-semibold text-sa-text">API Configuration</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-sa-border bg-sa-bg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-sa-text">Anthropic API Key</p>
              <p className="text-xs text-sa-muted mt-0.5">Used for all AI waiter conversations</p>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
              Configured
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-sa-border bg-sa-bg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-sa-text">AI Model</p>
              <p className="text-xs text-sa-muted mt-0.5">Current default model</p>
            </div>
            <span className="font-mono text-xs text-sa-muted">claude-sonnet-4-6</span>
          </div>
        </div>
        <p className="text-xs text-sa-muted">
          API keys are managed via environment variables. Update <code className="bg-sa-border/30 px-1 py-0.5 rounded">ANTHROPIC_API_KEY</code> in your deployment settings.
        </p>
      </section>

      {/* Platform defaults */}
      <section className="rounded-2xl border border-sa-border bg-sa-surface p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-sa-accent" />
          <h2 className="font-display text-base font-semibold text-sa-text">Platform Defaults</h2>
        </div>
        <div className="grid gap-3 text-sm">
          {[
            { key: "Default Tier on Approval", value: "Standard ($199/mo)" },
            { key: "Default Tax Rate",          value: "8%" },
            { key: "Default Currency",          value: "USD" },
            { key: "AI Chat Polling Interval",  value: "10 seconds" },
            { key: "Session Timeout",           value: "4 hours" },
            { key: "QR Error Correction",       value: "High (H)" },
          ].map(({ key, value }) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-sa-border bg-sa-bg px-4 py-3">
              <span className="text-sa-muted">{key}</span>
              <span className="font-medium text-sa-text">{value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-sa-muted">
          Platform defaults are configured in <code className="bg-sa-border/30 px-1 py-0.5 rounded">src/lib/constants.ts</code> and environment variables.
        </p>
      </section>

      {/* Admin account */}
      <section className="rounded-2xl border border-sa-border bg-sa-surface p-6 space-y-3">
        <h2 className="font-display text-base font-semibold text-sa-text">Admin Account</h2>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-sa-muted">Name</span>
            <span className="text-sa-text">{session.user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sa-muted">Email</span>
            <span className="text-sa-text">{session.user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sa-muted">Role</span>
            <span className="rounded-full border border-sa-accent/30 bg-sa-accent/10 px-2 py-0.5 text-xs font-medium text-sa-accent">
              super_admin
            </span>
          </div>
        </div>
        <p className="text-xs text-sa-muted">
          To change the super admin password, update <code className="bg-sa-border/30 px-1 py-0.5 rounded">SUPER_ADMIN_PASSWORD</code> and re-run the seed script.
        </p>
      </section>
    </div>
  );
}
