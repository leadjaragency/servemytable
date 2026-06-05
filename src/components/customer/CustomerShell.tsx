"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CustomerProvider, useCustomer } from "@/lib/CustomerContext";
import { BottomNav } from "@/components/customer/BottomNav";
import { UtensilsCrossed, AlertCircle, RefreshCw } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../messages/en.json";
import deMessages from "../../../messages/de.json";

const messageMap: Record<string, object> = {
  en: enMessages,
  de: deMessages,
  fr: enMessages,
  es: enMessages,
};

// ---------------------------------------------------------------------------
// Error / loading full-screen states (cu-* theme)
// ---------------------------------------------------------------------------

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cu-bg px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cu-accent/10">
        <UtensilsCrossed className="h-8 w-8 text-cu-accent animate-pulse" />
      </div>
      <div className="text-center">
        <p className="font-display text-lg font-semibold text-cu-text">Loading…</p>
        <p className="mt-1 text-sm text-cu-text/60">Fetching your table info</p>
      </div>
    </div>
  );
}

function OccupiedScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cu-bg px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
        <UtensilsCrossed className="h-8 w-8 text-amber-500" />
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-cu-text">Table is Occupied</p>
        <p className="mt-2 text-sm text-cu-text/60 max-w-xs">
          This table is currently occupied by another guest. Please ask your server for assistance.
        </p>
      </div>
    </div>
  );
}

function SessionEndedScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cu-bg px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cu-accent/10">
        <UtensilsCrossed className="h-8 w-8 text-cu-accent" />
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-cu-text">Session Ended</p>
        <p className="mt-2 text-sm text-cu-text/60 max-w-xs">
          Your table session has been closed by the staff. Thank you for dining with us!
        </p>
      </div>
      <p className="text-xs text-cu-text/40">Please scan the QR code to start a new session.</p>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cu-bg px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-cu-text">Something went wrong</p>
        <p className="mt-2 text-sm text-cu-text/60 max-w-xs">{message}</p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 rounded-xl border border-cu-border bg-cu-surface px-4 py-2 text-sm font-medium text-cu-text shadow-sm hover:bg-white/5 transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
      <p className="text-xs text-cu-text/40">
        Please scan the QR code on your table again.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner shell — consumes context to know when loading/error is resolved
// ---------------------------------------------------------------------------

function ShellInner({
  tableId,
  children,
}: {
  tableId: string;
  children: React.ReactNode;
}) {
  const searchParams      = useSearchParams();
  const restaurantSlug    = searchParams.get("restaurant") ?? "";
  const { loading, error, tableOccupied, sessionEnded, restaurant } = useCustomer();

  if (loading)       return <LoadingScreen />;
  if (tableOccupied) return <OccupiedScreen />;
  if (sessionEnded)  return <SessionEndedScreen />;
  if (error)         return <ErrorScreen message={error} />;

  const locale   = (restaurant?.defaultLanguage ?? "en") as string;
  const messages = messageMap[locale] ?? messageMap.en;

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(e) => { if (e.code !== "MISSING_MESSAGE") console.error(e); }}
      getMessageFallback={({ key }) => key}
    >
      <div className="flex min-h-dvh flex-col">
        {/* Scrollable page content — leave room for 64px bottom nav */}
        <main className="flex-1 overflow-y-auto pb-16">
          {children}
        </main>

        {/* Fixed bottom navigation */}
        <BottomNav tableId={tableId} restaurantSlug={restaurantSlug} />
      </div>
    </NextIntlClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Public export — used by the server layout
// ---------------------------------------------------------------------------

export function CustomerShell({
  tableId,
  children,
}: {
  tableId: string;
  children: React.ReactNode;
}) {
  return (
    // Suspense is required because useSearchParams() inside a client component
    // that is rendered from a server layout needs a Suspense boundary.
    <Suspense fallback={<LoadingScreen />}>
      <CustomerProvider>
        <ShellInner tableId={tableId}>{children}</ShellInner>
      </CustomerProvider>
    </Suspense>
  );
}
