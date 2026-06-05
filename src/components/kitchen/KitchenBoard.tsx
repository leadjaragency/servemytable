"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, AlertTriangle, ChefHat, RefreshCw } from "lucide-react";
import { cn, formatTimeAgo } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Dish {
  id: string;
  name: string;
  allergens: string[];
  imageEmoji: string | null;
  isVeg: boolean;
  isVegan: boolean;
}

interface OrderItem {
  id: string;
  quantity: number;
  specialInst?: string | null;
  dish: Dish;
}

interface KitchenOrder {
  id: string;
  orderNumber: string;
  status: string;
  specialNotes: string | null;
  createdAt: string;
  table: { id: string; number: number; seats: number };
  items: OrderItem[];
}

interface KitchenBoardProps {
  token: string;
  restaurantName: string;
  initialOrders: KitchenOrder[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLUMNS = [
  { status: "received", label: "New Orders", accent: "#6E8BD6", next: "preparing", nextLabel: "Start Preparing" },
  { status: "preparing", label: "On the Fire", accent: "#FF4D00", next: "ready", nextLabel: "Mark Ready" },
  { status: "ready", label: "Ready to Serve", accent: "#2FB463", next: "served", nextLabel: "Mark Served" },
] as const;

const ALLERGEN_KEYWORDS = [
  "allerg", "intoleran", "anaphyl", "no nut", "no peanut", "no dairy", "no milk",
  "no gluten", "no egg", "nut free", "dairy free", "gluten free", "egg free",
  "shellfish", "sesame", "mustard",
];

function hasAllergenConcern(text: string | null | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return ALLERGEN_KEYWORDS.some((kw) => lower.includes(kw));
}

function playNewOrderSound() {
  try {
    const audio = new Audio("/sounds/new-order.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Order card
// ---------------------------------------------------------------------------

function OrderCard({
  order,
  accent,
  nextLabel,
  onAdvance,
  busy,
}: {
  order: KitchenOrder;
  accent: string;
  nextLabel: string;
  onAdvance: () => void;
  busy: boolean;
}) {
  const allergenNote = hasAllergenConcern(order.specialNotes);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "#161616",
        border: "1px solid #262626",
        boxShadow: "0 18px 40px -16px rgba(0,0,0,0.8)",
      }}
    >
      <div className="h-[3px]" style={{ background: accent, boxShadow: `0 0 14px ${accent}99` }} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl leading-none" style={{ color: "#FAF6ED" }}>
              T{order.table.number}
            </span>
            <span className="text-xs font-mono" style={{ color: "#7C736D" }}>#{order.orderNumber}</span>
          </div>
          <span className="flex items-center gap-1 text-xs" style={{ color: "#AD897E" }}>
            <Clock className="h-3.5 w-3.5" />
            {formatTimeAgo(order.createdAt)}
          </span>
        </div>

        <ul className="space-y-1.5 mb-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2" style={{ color: "#EAE4DB" }}>
              <span
                className="flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-sm font-bold"
                style={{ background: "rgba(198,163,78,0.14)", color: "#E8C269", border: "1px solid rgba(198,163,78,0.25)" }}
              >
                {item.quantity}
              </span>
              <span className="text-base leading-6">
                {item.dish.imageEmoji ? `${item.dish.imageEmoji} ` : ""}
                {item.dish.name}
              </span>
              {item.specialInst ? (
                <span className="text-xs italic leading-6" style={{ color: "#AD897E" }}>— {item.specialInst}</span>
              ) : null}
            </li>
          ))}
        </ul>

        {order.specialNotes ? (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg px-3 py-2 mb-3 text-sm"
            )}
            style={{
              background: allergenNote ? "rgba(255,77,0,0.12)" : "rgba(255,255,255,0.04)",
              border: allergenNote ? "1px solid rgba(255,77,0,0.45)" : "1px solid #262626",
              color: allergenNote ? "#FFB4AB" : "#C9C2B9",
            }}
          >
            {allergenNote ? <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#FF6A33" }} /> : null}
            <span>{order.specialNotes}</span>
          </div>
        ) : null}

        <button
          onClick={onAdvance}
          disabled={busy}
          className="w-full rounded-lg py-3 text-base font-semibold tracking-wide transition-all hover:brightness-110 disabled:opacity-50"
          style={{
            background: accent,
            color: "#0A0A0A",
            boxShadow: `0 8px 22px -8px ${accent}88`,
          }}
        >
          {busy ? "…" : nextLabel}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export function KitchenBoard({ token, restaurantName, initialOrders }: KitchenBoardProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const knownIds = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/kitchen/${token}/orders`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const next: KitchenOrder[] = data.orders ?? [];

      // Detect genuinely new orders → sound
      const hasNew = next.some((o) => !knownIds.current.has(o.id));
      if (hasNew) playNewOrderSound();
      knownIds.current = new Set(next.map((o) => o.id));

      setOrders(next);
    } catch {
      /* offline — keep current */
    }
  }, [token]);

  // Poll every 5s
  useEffect(() => {
    const id = setInterval(fetchOrders, 5000);
    return () => clearInterval(id);
  }, [fetchOrders]);

  async function advance(order: KitchenOrder, to: string) {
    setBusyId(order.id);
    // Optimistic: remove if leaving the board (served) else update status
    const prev = orders;
    setOrders((cur) =>
      to === "served"
        ? cur.filter((o) => o.id !== order.id)
        : cur.map((o) => (o.id === order.id ? { ...o, status: to } : o))
    );
    try {
      const res = await fetch(`/api/kitchen/${token}/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: to }),
      });
      if (!res.ok) {
        setOrders(prev); // revert on failure
      } else {
        knownIds.current.delete(order.id);
        fetchOrders();
      }
    } catch {
      setOrders(prev);
    } finally {
      setBusyId(null);
    }
  }

  async function manualRefresh() {
    setRefreshing(true);
    await fetchOrders();
    setTimeout(() => setRefreshing(false), 400);
  }

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 backdrop-blur-md"
        style={{ background: "rgba(19,19,19,0.92)", borderBottom: "1px solid #242424" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "rgba(198,163,78,0.12)", border: "1px solid rgba(198,163,78,0.25)" }}
          >
            <ChefHat className="h-5 w-5" style={{ color: "#C6A34E" }} />
          </div>
          <div>
            <h1 className="font-display text-2xl leading-none" style={{ color: "#FAF6ED" }}>
              Kitchen Display
            </h1>
            <p className="text-xs font-medium tracking-wide" style={{ color: "#AD897E" }}>{restaurantName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium" style={{ color: "#2FB463" }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: "#2FB463" }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "#2FB463" }} />
            </span>
            Live · auto-refresh
          </span>
          <button
            onClick={manualRefresh}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "#AD897E", border: "1px solid #242424" }}
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </header>

      {/* Columns */}
      <div className="grid gap-4 p-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colOrders = orders
            .filter((o) => o.status === col.status)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return (
            <section key={col.status} className="flex flex-col">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.accent, boxShadow: `0 0 10px ${col.accent}99` }} />
                  <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: "#EAE4DB" }}>
                    {col.label}
                  </h2>
                </div>
                <span
                  className="flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold"
                  style={{ background: col.accent, color: "#0A0A0A" }}
                >
                  {colOrders.length}
                </span>
              </div>
              <div className="space-y-3">
                {colOrders.length === 0 ? (
                  <div
                    className="rounded-xl py-10 text-center text-sm"
                    style={{ border: "1px dashed #262626", color: "#5C5650" }}
                  >
                    No orders
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      accent={col.accent}
                      nextLabel={col.nextLabel}
                      busy={busyId === order.id}
                      onAdvance={() => advance(order, col.next)}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
