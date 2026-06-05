"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  ClipboardList, ChevronDown, ChevronUp, Loader2,
  CheckCircle2, Users, CreditCard, Smartphone,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCustomer } from "@/lib/CustomerContext";
import { formatCurrency, cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderItem {
  id:          string;
  quantity:    number;
  unitPrice:   number;
  specialInst: string | null;
  dish:        { name: string; imageEmoji: string | null };
}

interface Order {
  id:          string;
  orderNumber: string;
  status:      string;
  subtotal:    number;
  tax:         number;
  discount:    number;
  total:       number;
  items:       OrderItem[];
}

// ---------------------------------------------------------------------------
// Tip buttons
// ---------------------------------------------------------------------------

const TIP_PRESETS = [
  { label: "10%", pct: 0.10 },
  { label: "15%", pct: 0.15 },
  { label: "20%", pct: 0.20 },
];

// ---------------------------------------------------------------------------
// Order page (formerly Bill)
// ---------------------------------------------------------------------------

export default function OrderPage() {
  const t              = useTranslations("customer.bill");
  const params         = useParams<{ tableId: string }>();
  const searchParams   = useSearchParams();
  const router         = useRouter();
  const restaurantSlug = searchParams.get("restaurant") ?? "";
  const { sessionId, restaurant } = useCustomer();

  const [orders,      setOrders]      = useState<Order[]>([]);
  const [sessionDisc, setSessionDisc] = useState<number | null>(null);
  const [taxRate,     setTaxRate]     = useState(0.08);
  const [loading,     setLoading]     = useState(true);
  const [tipPct,      setTipPct]      = useState(0.15);
  const [customTip,   setCustomTip]   = useState("");
  const [showCustom,  setShowCustom]  = useState(false);
  const [splitBy,     setSplitBy]     = useState(1);
  const [showSplit,   setShowSplit]   = useState(false);

  // Payment state
  const [payMode,         setPayMode]         = useState<"online" | "card" | null>(null);
  const [paying,          setPaying]          = useState(false);
  const [paid,            setPaid]            = useState(false);
  const [cardRequested,   setCardRequested]   = useState(false);
  const [cardLoading,     setCardLoading]     = useState(false);

  useEffect(() => {
    if (!sessionId || !restaurantSlug) { setLoading(false); return; }
    fetch(`/api/customer/orders?sessionId=${sessionId}&restaurant=${restaurantSlug}`)
      .then((r) => r.json())
      .then((d: { orders?: Order[]; session?: { discount: number | null }; taxRate?: number }) => {
        setOrders(d.orders ?? []);
        setSessionDisc(d.session?.discount ?? null);
        setTaxRate(d.taxRate ?? 0.08);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId, restaurantSlug]);

  // ── Calculations ─────────────────────────────────────────────────────────
  const subtotal     = orders.reduce((s, o) => s + o.subtotal, 0);
  const tax          = Math.round(subtotal * taxRate * 100) / 100;
  const gameDiscount = sessionDisc ? Math.round(subtotal * sessionDisc * 100) / 100 : 0;
  const afterDisc    = subtotal + tax - gameDiscount;
  const effectiveTip = showCustom ? (parseFloat(customTip) || 0) : (afterDisc * tipPct);
  const grandTotal   = afterDisc + effectiveTip;
  const perPerson    = splitBy > 1 ? grandTotal / splitBy : null;

  // ── Pay Online handler ────────────────────────────────────────────────────
  const handlePayOnline = useCallback(async () => {
    if (paying || paid) return;
    setPayMode("online");
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1800));
    setPaying(false);
    setPaid(true);
    setTimeout(() => {
      router.push(`/table/${params.tableId}/review?restaurant=${encodeURIComponent(restaurantSlug)}`);
    }, 1200);
  }, [paying, paid, params.tableId, restaurantSlug, router]);

  // ── Call for Card Machine handler ─────────────────────────────────────────
  const handleCardMachine = useCallback(async () => {
    if (cardLoading || cardRequested) return;
    setPayMode("card");
    setCardLoading(true);
    try {
      await fetch("/api/customer/request-payment", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sessionId, restaurantSlug }),
      });
    } catch {
      // Non-fatal — show success regardless
    } finally {
      setCardLoading(false);
      setCardRequested(true);
    }
  }, [cardLoading, cardRequested, sessionId, restaurantSlug]);

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cu-bg">
        <Loader2 className="h-8 w-8 animate-spin text-cu-accent" />
      </div>
    );
  }

  if (paid) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cu-bg px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cu-green/10">
          <CheckCircle2 className="h-10 w-10 text-cu-green" />
        </div>
        <p className="font-display text-2xl font-bold text-cu-text">{t("paymentSuccess")}</p>
        <p className="text-cu-text/60 text-sm">{t("redirectingReview")}</p>
      </div>
    );
  }

  if (cardRequested) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cu-bg px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cu-accent/10">
          <CreditCard className="h-10 w-10 text-cu-accent" />
        </div>
        <p className="font-display text-2xl font-bold text-cu-text">Representative Notified!</p>
        <p className="text-cu-text/60 text-sm leading-relaxed">
          A member of our team is on their way to your table with the card machine.
        </p>
        <button
          onClick={() => setCardRequested(false)}
          className="mt-2 rounded-2xl border border-cu-border px-6 py-2.5 text-sm font-medium text-cu-text/60"
        >
          Back to Order
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cu-bg px-6 text-center">
        <ClipboardList className="h-12 w-12 text-cu-accent/30" />
        <p className="font-display text-xl font-semibold text-cu-text">{t("noOrders")}</p>
        <p className="text-sm text-cu-text/50">{t("noOrdersSubtitle")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cu-bg pb-44">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-cu-border bg-[#131313]/95 px-4 py-3 backdrop-blur-sm">
        <h1 className="font-display text-lg font-bold text-cu-text text-center">{t("title")}</h1>
        {restaurant && (
          <p className="text-center text-xs text-cu-text/40 mt-0.5">{restaurant.name}</p>
        )}
      </header>

      <div className="mx-auto max-w-md px-4 pt-5 space-y-4">
        {/* Order items */}
        {orders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-cu-border bg-cu-surface overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-cu-bg border-b border-cu-border">
              <span className="text-xs font-medium text-cu-text/60">Order #{order.orderNumber}</span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                order.status === "served"    && "bg-cu-green/10 text-cu-green",
                order.status === "ready"     && "bg-cu-accent/10 text-cu-accent",
                order.status === "preparing" && "bg-amber-100 text-amber-700",
                order.status === "received"  && "bg-cu-border text-cu-muted",
              )}>
                {order.status}
              </span>
            </div>
            <div className="divide-y divide-cu-border/50">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{item.dish.imageEmoji ?? "🍽️"}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-cu-text truncate">{item.dish.name}</p>
                      {item.specialInst && (
                        <p className="text-[10px] text-cu-text/40 truncate">{item.specialInst}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-cu-text/50">×{item.quantity}</span>
                    <span className="text-sm font-medium text-cu-text">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Totals */}
        <div className="rounded-2xl border border-cu-border bg-cu-surface overflow-hidden">
          <div className="divide-y divide-cu-border/50 px-4">
            <div className="flex justify-between py-3 text-sm">
              <span className="text-cu-text/60">{t("subtotal")}</span>
              <span className="text-cu-text">{formatCurrency(subtotal, restaurant?.currency)}</span>
            </div>
            <div className="flex justify-between py-3 text-sm">
              <span className="text-cu-text/60">{t("tax")} ({(taxRate * 100).toFixed(0)}%)</span>
              <span className="text-cu-text">{formatCurrency(tax, restaurant?.currency)}</span>
            </div>
            {gameDiscount > 0 && (
              <div className="flex justify-between py-3 text-sm">
                <span className="text-cu-green font-medium">
                  🎰 Game Discount ({((sessionDisc ?? 0) * 100).toFixed(0)}%)
                </span>
                <span className="text-cu-green font-medium">-{formatCurrency(gameDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between py-3 text-sm">
              <span className="text-cu-text/60">{t("tip")}</span>
              <span className="text-cu-text">{formatCurrency(effectiveTip, restaurant?.currency)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between bg-cu-accent/5 px-4 py-4">
            <span className="font-bold text-cu-text text-base">{t("total")}</span>
            <span className="font-display text-2xl font-bold text-cu-accent">
              {formatCurrency(grandTotal, restaurant?.currency)}
            </span>
          </div>
        </div>

        {/* Tip selector */}
        <div className="rounded-2xl border border-cu-border bg-cu-surface p-4">
          <p className="text-sm font-medium text-cu-text mb-3">{t("addTip")}</p>
          <div className="grid grid-cols-4 gap-2">
            {TIP_PRESETS.map((tp) => (
              <button
                key={tp.label}
                onClick={() => { setTipPct(tp.pct); setShowCustom(false); setCustomTip(""); }}
                className={cn(
                  "rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors",
                  !showCustom && tipPct === tp.pct
                    ? "border-cu-accent bg-cu-accent/10 text-cu-accent"
                    : "border-cu-border text-cu-text/60"
                )}
              >
                {tp.label}
              </button>
            ))}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className={cn(
                "rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors",
                showCustom ? "border-cu-accent bg-cu-accent/10 text-cu-accent" : "border-cu-border text-cu-text/60"
              )}
            >
              Custom
            </button>
          </div>
          {showCustom && (
            <div className="mt-3 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cu-text/50">$</span>
              <input
                type="number"
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                placeholder="Enter tip amount"
                className="w-full rounded-xl border border-cu-border py-2.5 pl-7 pr-3 text-sm focus:border-cu-accent/50 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Split bill */}
        <div className="rounded-2xl border border-cu-border bg-cu-surface overflow-hidden">
          <button
            onClick={() => setShowSplit(!showSplit)}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cu-accent" />
              <span className="text-sm font-medium text-cu-text">Split Bill</span>
            </div>
            {showSplit ? <ChevronUp className="h-4 w-4 text-cu-text/40" /> : <ChevronDown className="h-4 w-4 text-cu-text/40" />}
          </button>
          {showSplit && (
            <div className="border-t border-cu-border px-4 py-3 space-y-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setSplitBy(Math.max(1, splitBy - 1))} className="h-9 w-9 rounded-full border border-cu-border text-lg font-bold text-cu-text">−</button>
                <span className="flex-1 text-center text-base font-semibold text-cu-text">{splitBy} {splitBy === 1 ? "person" : "people"}</span>
                <button onClick={() => setSplitBy(Math.min(20, splitBy + 1))} className="h-9 w-9 rounded-full border border-cu-border text-lg font-bold text-cu-text">+</button>
              </div>
              {perPerson !== null && (
                <p className="text-center text-sm text-cu-text/70">
                  Each person pays: <strong className="text-cu-accent">{formatCurrency(perPerson)}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment buttons — fixed bottom */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-gradient-to-t from-cu-bg via-cu-bg/95 to-transparent px-4 pb-3 pt-5">
        <div className="mx-auto max-w-md space-y-2.5">
          {/* Pay Online */}
          <button
            onClick={handlePayOnline}
            disabled={paying}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-cu-accent py-4 text-base font-bold text-white shadow-lg active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {paying && payMode === "online" ? (
              <><Loader2 className="h-5 w-5 animate-spin" />Processing…</>
            ) : (
              <><Smartphone className="h-5 w-5" />{t("payOnline")}</>
            )}
          </button>

          {/* Call for Card Machine */}
          <button
            onClick={handleCardMachine}
            disabled={cardLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-cu-accent bg-cu-surface py-3.5 text-base font-bold text-cu-accent active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {cardLoading ? (
              <><Loader2 className="h-5 w-5 animate-spin" />{t("notifying")}</>
            ) : (
              <><CreditCard className="h-5 w-5" />{t("callCardMachine")}</>
            )}
          </button>
          <p className="text-center text-[11px] text-cu-text/40">
            {t("cardMachineNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
