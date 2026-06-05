"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useCustomer } from "@/lib/CustomerContext";
import { Loader2, Utensils } from "lucide-react";
import { useTranslations } from "next-intl";

export default function TableSplashPage() {
  const router         = useRouter();
  const params         = useParams<{ tableId: string }>();
  const searchParams   = useSearchParams();
  const restaurantSlug = searchParams.get("restaurant") ?? "";

  const { restaurant, table, waiter, loading, error, setSessionId } = useCustomer();
  const t = useTranslations("customer");

  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");

  // Guard so the session is created and the redirect is scheduled exactly once.
  // The public-demo restaurant mints a fresh session on every POST /api/sessions,
  // and setSessionId triggers a context refetch that returns new restaurant/table
  // object references — without this guard the effect would re-run, spawn endless
  // sessions, and keep clearing the redirect timer (splash gets stuck forever).
  const startedRef = useRef(false);

  // Once context resolves, create the session + start the redirect timer (once).
  useEffect(() => {
    if (loading) return;
    if (error || !restaurant || !table) { setPhase("error"); return; }

    setPhase("ready");

    // Create the table session only once (guarded). The redirect timer below is
    // intentionally NOT guarded so it re-arms after React StrictMode's dev
    // re-invoke (which clears the first timer) and after any context refetch.
    if (!startedRef.current) {
      startedRef.current = true;
      // Create table session — fire-and-forget; timer runs regardless of outcome
      fetch("/api/sessions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          restaurantSlug: restaurant.slug,
          tableNumber:    table.number,
        }),
      })
        .then((r) => r.json())
        .then((data: { sessionId?: string }) => {
          if (data.sessionId) setSessionId(data.sessionId);
        })
        .catch(() => {
          // Non-fatal — customer can still browse
        });
    }

    // Redirect to chat shortly after the branded splash.
    const redirectTimer = setTimeout(() => {
      router.push(
        `/table/${params.tableId}/chat?restaurant=${encodeURIComponent(restaurantSlug)}`
      );
    }, 1800);

    return () => clearTimeout(redirectTimer);
    // Depend on stable ids (not object refs) so context refetches don't re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, restaurant?.id, table?.id]);

  // ── Error state ─────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cu-bg px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <Utensils className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <p className="font-display text-xl font-bold text-cu-text">{t("errors.tableNotFound" as any)}</p>
          <p className="mt-2 text-sm text-cu-text/60">
            {error ?? "Please scan the QR code on your table again."}
          </p>
        </div>
      </div>
    );
  }

  // ── Context still loading ───────────────────────────────────────────────
  if (phase === "loading" || !restaurant || !table) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-[#0A0A0A] via-[#171310] to-[#2A1206]">
        <Loader2 className="h-10 w-10 animate-spin text-white/60" />
      </div>
    );
  }

  // ── Full splash screen ──────────────────────────────────────────────────
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-b from-[#0A0A0A] via-[#171310] to-[#2A1206] px-8 text-center">
      {/* Restaurant initial badge */}
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-4xl font-bold text-white shadow-lg backdrop-blur-sm ring-1 ring-white/20">
        {restaurant.name.charAt(0)}
      </div>

      {/* Restaurant name + tagline */}
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-white drop-shadow">
          {restaurant.name}
        </h1>
        {restaurant.tagline && (
          <p className="text-base text-white/70 italic">{restaurant.tagline}</p>
        )}
      </div>

      {/* Table number pill */}
      <div className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur-sm">
        {t("splash.table", { number: table.number })} · {table.seats} {t("admin.tables.seats", { count: table.seats } as any)}
      </div>

      {/* AI waiter card */}
      {waiter && (
        <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
          <span className="text-3xl leading-none">{waiter.avatar}</span>
          <div className="text-left">
            <p className="text-xs font-medium uppercase tracking-wider text-white/50">
              {t("splash.loading")}
            </p>
            <p className="text-base font-semibold text-white">{waiter.name}</p>
            <p className="text-xs text-white/60 capitalize">{waiter.personality}</p>
          </div>
        </div>
      )}

      {/* Connection spinner */}
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
        <p className="text-sm text-white/60">
          {waiter
            ? `Connecting to ${waiter.name}\u2026`
            : "Connecting to your AI waiter\u2026"}
        </p>
      </div>
    </div>
  );
}
