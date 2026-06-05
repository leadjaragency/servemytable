"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Trash2, Plus, Minus, ShoppingCart, ChevronDown,
  ArrowLeft, AlertTriangle, CheckCircle2, MessageCircle,
  StickyNote, Tag, X, Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCartStore, selectSubtotal } from "@/lib/store";
import { useCustomer } from "@/lib/CustomerContext";
import { formatCurrency, cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PromoResult {
  promoId:     string;
  title:       string;
  description: string;
  type:        string;   // "percentage" | "fixed" | "freeItem"
  value:       number;
  discount:    number;
}

// ---------------------------------------------------------------------------
// Empty cart
// ---------------------------------------------------------------------------

function EmptyCart({ tableId, slug }: { tableId: string; slug: string }) {
  const router = useRouter();
  const t = useTranslations("customer.cart");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 bg-cu-bg">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-cu-accent/10">
        <ShoppingCart className="h-10 w-10 text-cu-accent" />
      </div>
      <div className="text-center">
        <p className="font-display text-xl font-semibold text-cu-text">{t("empty")}</p>
        <p className="mt-1 text-sm text-cu-text/60">{t("emptySubtitle")}</p>
      </div>
      <button
        onClick={() =>
          router.push(`/table/${tableId}/menu?restaurant=${encodeURIComponent(slug)}`)
        }
        className="flex items-center gap-2 rounded-2xl bg-cu-accent px-6 py-3 text-sm font-semibold text-white shadow-md active:scale-95 transition-transform"
      >
        {t("browseMenu")}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Success overlay
// ---------------------------------------------------------------------------

function SuccessOverlay({
  waiterName,
  waiterAvatar,
}: {
  waiterName?: string;
  waiterAvatar?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-cu-surface px-8 text-center"
      style={{ animation: "fadeInScale 0.35s ease both" }}
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
        {waiterAvatar ? (
          <span className="text-5xl leading-none">{waiterAvatar}</span>
        ) : (
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        )}
      </div>
      <div>
        <p className="font-display text-2xl font-bold text-cu-text">Order placed!</p>
        <p className="mt-2 text-sm text-cu-text/60 leading-relaxed max-w-xs">
          {waiterName
            ? `${waiterName} has received your order and the kitchen is on it!`
            : "Your order is confirmed and the kitchen is on it!"}
        </p>
      </div>
      <div className="flex items-center gap-2 text-cu-text/40 text-xs">
        <div className="h-1.5 w-1.5 rounded-full bg-cu-accent animate-bounce" />
        <div className="h-1.5 w-1.5 rounded-full bg-cu-accent animate-bounce [animation-delay:150ms]" />
        <div className="h-1.5 w-1.5 rounded-full bg-cu-accent animate-bounce [animation-delay:300ms]" />
        <span className="ml-1">Taking you to chat…</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cart item row
// ---------------------------------------------------------------------------

interface CartItemRowProps {
  dishId:       string;
  name:         string;
  price:        number;
  quantity:     number;
  imageEmoji?:  string;
  specialInst?: string;
  allergens:    string[];
  currency:     string;
  onIncrease:   () => void;
  onDecrease:   () => void;
  onRemove:     () => void;
  onInstChange: (v: string) => void;
}

function CartItemRow({
  name, price, quantity, imageEmoji, specialInst, currency,
  onIncrease, onDecrease, onRemove, onInstChange,
}: CartItemRowProps) {
  const [showInst, setShowInst] = useState(!!specialInst);
  const itemTotal = price * quantity;

  return (
    <div className="rounded-2xl bg-cu-surface border border-cu-border shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-orange-50 text-2xl leading-none">
          {imageEmoji ?? "🍽️"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-cu-text text-sm leading-snug line-clamp-1">{name}</p>
          <p className="text-xs text-cu-text/50 mt-0.5">
            {formatCurrency(price, currency)} each
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <p className="text-sm font-semibold text-cu-accent tabular-nums">
            {formatCurrency(itemTotal, currency)}
          </p>
          <div className="flex items-center gap-0 rounded-full border border-cu-border bg-cu-bg overflow-hidden h-7">
            <button
              onClick={onDecrease}
              className="flex h-7 w-7 items-center justify-center text-cu-text/60 hover:text-cu-accent active:scale-90 transition-colors"
              aria-label="Decrease"
            >
              <Minus className="h-3 w-3" strokeWidth={2.5} />
            </button>
            <span className="min-w-[1.5rem] text-center text-sm font-semibold text-cu-text leading-none">
              {quantity}
            </span>
            <button
              onClick={onIncrease}
              className="flex h-7 w-7 items-center justify-center text-cu-text/60 hover:text-cu-accent active:scale-90 transition-colors"
              aria-label="Increase"
            >
              <Plus className="h-3 w-3" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 pb-2.5 gap-2">
        <button
          onClick={() => setShowInst((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-cu-text/50 hover:text-cu-text/70 transition-colors"
        >
          <StickyNote className="h-3.5 w-3.5" />
          {showInst ? "Hide note" : "Add note"}
          <ChevronDown
            className={cn("h-3 w-3 transition-transform duration-150", showInst && "rotate-180")}
          />
        </button>
        <button
          onClick={onRemove}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>

      {showInst && (
        <div className="border-t border-cu-border/50 px-3 pb-3 pt-2.5">
          <textarea
            value={specialInst ?? ""}
            onChange={(e) => onInstChange(e.target.value)}
            placeholder="e.g. extra spicy, no onions, nut allergy note…"
            maxLength={200}
            rows={2}
            className="w-full resize-none rounded-xl border border-cu-border bg-cu-bg px-3 py-2 text-xs text-cu-text placeholder:text-cu-text/30 outline-none focus:border-cu-accent/50 focus:ring-1 focus:ring-cu-accent/20 transition-colors"
          />
          <p className="mt-1 text-right text-[10px] text-cu-text/30">
            {(specialInst ?? "").length}/200
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Allergen summary
// ---------------------------------------------------------------------------

function AllergenWarning({ allergens }: { allergens: string[] }) {
  if (allergens.length === 0) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs font-semibold text-amber-800">Allergen notice</p>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
          Your order contains:{" "}
          <span className="font-medium">{allergens.join(", ")}</span>.
          Please inform our team of any concerns before ordering.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Promo code section
// ---------------------------------------------------------------------------

interface PromoSectionProps {
  restaurantSlug: string;
  subtotal:       number;
  applied:        PromoResult | null;
  onApply:        (result: PromoResult) => void;
  onRemove:       () => void;
}

function PromoSection({ restaurantSlug, subtotal, applied, onApply, onRemove }: PromoSectionProps) {
  const [open,    setOpen]    = useState(false);
  const [code,    setCode]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleApply() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/promotions/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ restaurantSlug, code: trimmed, subtotal }),
      });
      const data = await res.json() as {
        valid:        boolean;
        message?:     string;
        promoId?:     string;
        title?:       string;
        description?: string;
        type?:        string;
        value?:       number;
        discount?:    number;
      };

      if (!data.valid || !data.promoId) {
        setError(data.message ?? "Invalid promo code.");
      } else {
        onApply({
          promoId:     data.promoId,
          title:       data.title!,
          description: data.description!,
          type:        data.type!,
          value:       data.value!,
          discount:    data.discount!,
        });
        setOpen(false);
        setCode("");
      }
    } catch {
      setError("Failed to validate promo code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (applied) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
        <Tag className="h-4 w-4 text-green-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-green-800">{applied.title}</p>
          <p className="text-xs text-green-700 mt-0.5">{applied.description}</p>
        </div>
        <button
          onClick={onRemove}
          className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-green-100 transition-colors"
          aria-label="Remove promo"
        >
          <X className="h-3.5 w-3.5 text-green-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-cu-surface border border-cu-border shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm text-cu-text/60 hover:text-cu-text transition-colors"
      >
        <Tag className="h-4 w-4 text-cu-accent flex-shrink-0" />
        <span className="flex-1 text-left font-medium">Have a promo code?</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-cu-border/50 px-4 pb-4 pt-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
              placeholder="PROMO CODE"
              maxLength={80}
              className="flex-1 rounded-xl border border-cu-border bg-cu-bg px-3 py-2 text-sm font-mono text-cu-text tracking-wider placeholder:text-cu-text/30 placeholder:normal-case placeholder:tracking-normal outline-none focus:border-cu-accent/50 focus:ring-1 focus:ring-cu-accent/20 transition-colors"
            />
            <button
              onClick={handleApply}
              disabled={!code.trim() || loading}
              className="flex items-center gap-1.5 rounded-xl bg-cu-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-opacity active:scale-95"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CartPage() {
  const t          = useTranslations("customer.cart");
  const params       = useParams<{ tableId: string }>();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const restaurantSlug = searchParams.get("restaurant") ?? "";

  const { restaurant, table, sessionId, waiter } = useCustomer();

  const items             = useCartStore((s) => s.items);
  const subtotal          = useCartStore(selectSubtotal);
  const removeItem        = useCartStore((s) => s.removeItem);
  const updateQuantity    = useCartStore((s) => s.updateQuantity);
  const updateSpecialInst = useCartStore((s) => s.updateSpecialInst);
  const clearCart         = useCartStore((s) => s.clearCart);

  const [orderNotes,   setOrderNotes]   = useState("");
  const [promoApplied, setPromoApplied] = useState<PromoResult | null>(null);
  const [placing,      setPlacing]      = useState(false);
  const [placed,       setPlaced]       = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const taxRate       = restaurant?.taxRate ?? 0.08;
  const taxAmount     = +(subtotal * taxRate).toFixed(2);
  const promoDiscount = promoApplied?.discount ?? 0;
  const total         = Math.max(0, +(subtotal + taxAmount - promoDiscount).toFixed(2));
  const currency      = restaurant?.currency ?? "USD";

  const cartAllergens = [...new Set(items.flatMap((i) => i.allergens))];
  const totalQty      = items.reduce((s, i) => s + i.quantity, 0);

  function navToMenu() {
    router.push(`/table/${params.tableId}/menu?restaurant=${encodeURIComponent(restaurantSlug)}`);
  }

  async function handlePlaceOrder() {
    if (!table?.id) {
      setError("Table info not available. Please refresh the page.");
      return;
    }
    if (!sessionId) {
      setError("Session expired. Please scan your table's QR code again.");
      return;
    }
    if (items.length === 0) return;

    setPlacing(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId:        table.id,
          sessionId,
          restaurantSlug: restaurant?.slug ?? restaurantSlug,
          items: items.map((i) => ({
            dishId:      i.dishId,
            quantity:    i.quantity,
            specialInst: i.specialInst ?? null,
          })),
          specialNotes: orderNotes.trim() || null,
          discount:     promoDiscount,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to place order.");
      }

      const order = await res.json() as { orderNumber?: string };
      const orderNumber = order.orderNumber ?? "";

      setPlaced(true);
      clearCart();

      // Pass orderNumber to chat so the AI waiter can confirm the order
      setTimeout(() => {
        const chatUrl = `/table/${params.tableId}/chat?restaurant=${encodeURIComponent(restaurantSlug)}${orderNumber ? `&orderPlaced=${encodeURIComponent(orderNumber)}` : ""}`;
        router.push(chatUrl);
      }, 2800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPlacing(false);
    }
  }

  if (items.length === 0 && !placed) {
    return <EmptyCart tableId={params.tableId} slug={restaurantSlug} />;
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-cu-bg">
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {placed && (
        <SuccessOverlay waiterName={waiter?.name} waiterAvatar={waiter?.avatar} />
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-cu-border bg-[#131313]/95 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button
            onClick={navToMenu}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-cu-bg transition-colors"
            aria-label="Back to menu"
          >
            <ArrowLeft className="h-5 w-5 text-cu-text" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-cu-text leading-tight">{t("title")}</h1>
            {restaurant && (
              <p className="text-xs text-cu-text/50 leading-none mt-0.5">{restaurant.name}</p>
            )}
          </div>
          <span className="rounded-full bg-cu-accent/10 px-2.5 py-0.5 text-xs font-semibold text-cu-accent">
            {totalQty} {totalQty === 1 ? "item" : "items"}
          </span>
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <div className="flex-1 space-y-3 px-4 py-4 pb-36">

        {/* Item cards */}
        <div className="space-y-2">
          {items.map((item) => (
            <CartItemRow
              key={item.dishId}
              dishId={item.dishId}
              name={item.name}
              price={item.price}
              quantity={item.quantity}
              imageEmoji={item.imageEmoji}
              specialInst={item.specialInst}
              allergens={item.allergens}
              currency={currency}
              onIncrease={() => updateQuantity(item.dishId, item.quantity + 1)}
              onDecrease={() => updateQuantity(item.dishId, item.quantity - 1)}
              onRemove={() => removeItem(item.dishId)}
              onInstChange={(v) => updateSpecialInst(item.dishId, v)}
            />
          ))}
        </div>

        {/* Allergen warning */}
        <AllergenWarning allergens={cartAllergens} />

        {/* Order notes */}
        <div className="rounded-2xl bg-cu-surface border border-cu-border shadow-sm p-4">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-cu-text mb-2">
            <StickyNote className="h-3.5 w-3.5 text-cu-accent" />
            Order notes
            <span className="font-normal text-cu-text/40">(optional)</span>
          </label>
          <textarea
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="e.g. birthday celebration, dietary requirements, seating preference…"
            maxLength={400}
            rows={3}
            className="w-full resize-none rounded-xl border border-cu-border bg-cu-bg px-3 py-2.5 text-sm text-cu-text placeholder:text-cu-text/30 outline-none focus:border-cu-accent/50 focus:ring-1 focus:ring-cu-accent/20 transition-colors"
          />
          <p className="mt-1 text-right text-[10px] text-cu-text/30">{orderNotes.length}/400</p>
        </div>

        {/* Promo code */}
        <PromoSection
          restaurantSlug={restaurantSlug}
          subtotal={subtotal}
          applied={promoApplied}
          onApply={setPromoApplied}
          onRemove={() => setPromoApplied(null)}
        />

        {/* Pricing summary */}
        <div className="rounded-2xl bg-cu-surface border border-cu-border shadow-sm p-4 space-y-2.5">
          <p className="text-sm font-semibold text-cu-text">{t("orderSummary")}</p>

          <div className="flex justify-between text-sm">
            <span className="text-cu-text/60">{t("subtotal")}</span>
            <span className="text-cu-text font-medium tabular-nums">
              {formatCurrency(subtotal, currency)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-cu-text/60">{t("tax")} ({(taxRate * 100).toFixed(0)}%)</span>
            <span className="text-cu-text font-medium tabular-nums">
              {formatCurrency(taxAmount, currency)}
            </span>
          </div>

          {promoApplied && promoApplied.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600 font-medium flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                {promoApplied.type === "percentage"
                  ? `${promoApplied.value}% off — ${promoApplied.title}`
                  : promoApplied.title}
              </span>
              <span className="text-green-600 font-semibold tabular-nums">
                −{formatCurrency(promoApplied.discount, currency)}
              </span>
            </div>
          )}

          {promoApplied?.type === "freeItem" && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600 font-medium">Free item (added by kitchen)</span>
              <span className="text-green-600 font-semibold">🎁</span>
            </div>
          )}

          <div className="h-px bg-cu-border" />

          <div className="flex justify-between items-baseline">
            <span className="font-semibold text-cu-text">{t("total")}</span>
            <span className="font-bold text-cu-accent text-lg tabular-nums">
              {formatCurrency(total, currency)}
            </span>
          </div>

          <p className="text-[11px] text-cu-text/40 leading-relaxed">
            Final bill with any game discounts and tips shown on the Bill page.
          </p>
        </div>

        {/* Ask waiter nudge */}
        <button
          onClick={() =>
            router.push(
              `/table/${params.tableId}/chat?restaurant=${encodeURIComponent(restaurantSlug)}`
            )
          }
          className="flex w-full items-center gap-3 rounded-2xl border border-cu-border bg-cu-surface px-4 py-3 text-sm text-cu-text/60 hover:border-cu-accent/30 hover:text-cu-text transition-colors shadow-sm"
        >
          <MessageCircle className="h-4 w-4 text-cu-accent flex-shrink-0" />
          <span className="text-left">
            Have a question? Ask{" "}
            <span className="font-medium text-cu-text">{waiter?.name ?? "your waiter"}</span>
          </span>
        </button>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* ── Sticky CTA ── */}
      <div className="fixed bottom-16 left-0 right-0 z-30">
        <div className="mx-auto max-w-[480px] px-4 pb-3 pt-2">
          <div
            className="pointer-events-none absolute inset-x-0 -top-8 h-8"
            style={{
              background:
                "linear-gradient(to bottom, transparent, var(--color-cu-bg, #FDFBF7))",
            }}
          />
          <button
            onClick={handlePlaceOrder}
            disabled={placing || placed || items.length === 0}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-150",
              placing || placed
                ? "bg-cu-accent/50 cursor-not-allowed"
                : "bg-cu-accent hover:bg-cu-accent/90 active:scale-[0.98]"
            )}
          >
            {placing ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                {t("placing")}
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" />
                {t("placeOrder")} · {formatCurrency(total, currency)}
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[11px] text-cu-text/40">
            Your order goes directly to the kitchen
          </p>
        </div>
      </div>
    </div>
  );
}
