"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, AlertTriangle, ChefHat, Wifi, RefreshCw } from "lucide-react";
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
  { status: "received", label: "New Orders", accent: "#3B82F6", next: "preparing", nextLabel: "Start Preparing" },
  { status: "preparing", label: "Preparing", accent: "#F59E0B", next: "ready", nextLabel: "Mark Ready" },
  { status: "ready", label: "Ready to Serve", accent: "#22C55E", next: "served", nextLabel: "Mark Served" },
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
      className="rounded-xl overflow-hidden shadow-lg"
      style={{ background: "#1C1917", border: "1px solid #44403C" }}
    >
      <div className="h-1.5" style={{ background: accent }} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl leading-none text-white">
              T{order.table.number}
            </span>
            <span className="text-xs font-mono text-stone-400">#{order.orderNumber}</span>
          </div>
          <span className="flex items-center gap-1 text-xs text-stone-400">
            <Clock className="h-3.5 w-3.5" />
            {formatTimeAgo(order.createdAt)}
          </span>
        </div>

        <ul className="space-y-1.5 mb-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-stone-100">
              <span
                className="flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-sm font-bold"
                style={{ background: "rgba(198,163,78,0.15)", color: "#C6A34E" }}
              >
                {item.quantity}
              </span>
              <span className="text-base leading-6">
                {item.dish.imageEmoji ? `${item.dish.imageEmoji} ` : ""}
                {item.dish.name}
              </span>
              {item.specialInst ? (
                <span className="text-xs italic text-stone-400 leading-6">— {item.specialInst}</span>
              ) : null}
            </li>
          ))}
        </ul>

        {order.specialNotes ? (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg px-3 py-2 mb-3 text-sm",
              allergenNote ? "text-red-200" : "text-stone-300"
            )}
            style={{
              background: allergenNote ? "rgba(192,69,37,0.18)" : "rgba(255,255,255,0.04)",
              border: allergenNote ? "1px solid rgba(239,68,68,0.4)" : "1px solid #44403C",
            }}
          >
            {allergenNote ? <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" /> : null}
            <span>{order.specialNotes}</span>
          </div>
        ) : null}

        <button
          onClick={onAdvance}
          disabled={busy}
          className="w-full rounded-lg py-3 text-base font-bold text-stone-900 transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: accent }}
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
    <div className="min-h-screen" style={{ background: "#0C0A09" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
        style={{ background: "#1C1917", borderBottom: "1px solid #44403C" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "rgba(198,163,78,0.15)" }}
          >
            <ChefHat className="h-5 w-5" style={{ color: "#C6A34E" }} />
          </div>
          <div>
            <h1 className="font-display text-2xl leading-none text-white uppercase tracking-wide">
              Kitchen Display
            </h1>
            <p className="text-xs text-stone-400">{restaurantName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-green-400">
            <Wifi className="h-3.5 w-3.5" />
            Live · auto-refresh
          </span>
          <button
            onClick={manualRefresh}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-300 transition-colors hover:bg-white/10"
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
                  <span className="h-3 w-3 rounded-full" style={{ background: col.accent }} />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-stone-200">
                    {col.label}
                  </h2>
                </div>
                <span
                  className="flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold text-stone-900"
                  style={{ background: col.accent }}
                >
                  {colOrders.length}
                </span>
              </div>
              <div className="space-y-3">
                {colOrders.length === 0 ? (
                  <div
                    className="rounded-xl py-10 text-center text-sm text-stone-500"
                    style={{ border: "1px dashed #44403C" }}
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
