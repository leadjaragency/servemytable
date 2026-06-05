"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Clock, AlertTriangle, CheckCircle2, ChevronRight,
  Wifi, WifiOff, RefreshCw, Utensils, Download, X,
} from "lucide-react";
import { cn, formatTimeAgo, formatCurrency } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderStatus = "received" | "preparing" | "ready" | "served";

interface Dish {
  id:         string;
  name:       string;
  allergens:  string[];
  imageEmoji: string | null;
  isVeg:      boolean;
  isVegan:    boolean;
}

interface OrderItem {
  id:         string;
  quantity:   number;
  unitPrice:  number;
  specialInst: string | null;
  dish:       Dish;
}

interface TableSummary {
  id:     string;
  number: number;
  seats:  number;
}

interface Order {
  id:           string;
  orderNumber:  string;
  status:       string;
  subtotal:     number;
  tax:          number;
  discount:     number;
  total:        number;
  specialNotes: string | null;
  posSynced:    boolean;
  posOrderId:   string | null;
  createdAt:    string;
  updatedAt:    string;
  table:        TableSummary;
  items:        OrderItem[];
}

export interface OrdersPageClientProps {
  initialOrders: Order[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_PIPELINE: OrderStatus[] = ["received", "preparing", "ready", "served"];

const PIPELINE_CONFIG: Record<OrderStatus, {
  label:   string;
  bg:      string;
  text:    string;
  stripe:  string;
  ring:    string;
  nextLabel: string;
}> = {
  received:  { label: "Received",  bg: "bg-blue-500/10",  text: "text-blue-400",  stripe: "bg-blue-500",  ring: "ring-blue-500/30",  nextLabel: "Start Preparing" },
  preparing: { label: "Preparing", bg: "bg-amber-500/10", text: "text-amber-400", stripe: "bg-amber-500", ring: "ring-amber-500/30", nextLabel: "Mark Ready"      },
  ready:     { label: "Ready",     bg: "bg-green-500/10", text: "text-green-400", stripe: "bg-green-500", ring: "ring-green-500/30", nextLabel: "Mark Served"     },
  served:    { label: "Served",    bg: "bg-gray-500/10",  text: "text-gray-400",  stripe: "bg-gray-500",  ring: "ring-gray-500/30",  nextLabel: ""                },
};

// Words in special instructions that suggest allergen concern
const ALLERGEN_KEYWORDS = [
  "allerg", "intoleran", "anaphyl",
  "no nut", "no peanut", "no dairy", "no milk", "no gluten", "no egg",
  "nut free", "dairy free", "gluten free", "egg free",
  "vegan", "vegetarian", "jain",
  "shellfish", "shellfish", "soy", "sesame", "mustard", "wheat",
];

function hasAllergenConcern(text: string | null): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return ALLERGEN_KEYWORDS.some((kw) => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// Notification sound
// ---------------------------------------------------------------------------

function playNewOrderSound() {
  try {
    const audio = new Audio("/sounds/new-order.mp3");
    audio.volume = 0.4;
    audio.play().catch(() => {/* ignore autoplay block */});
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Status advance button
// ---------------------------------------------------------------------------

function AdvanceStatusButton({
  order,
  onAdvanced,
}: {
  order:      Order;
  onAdvanced: (orderId: string, newStatus: OrderStatus) => void;
}) {
  const [loading, setLoading] = useState(false);
  const currentIdx = STATUS_PIPELINE.indexOf(order.status as OrderStatus);
  const nextStatus = STATUS_PIPELINE[currentIdx + 1] as OrderStatus | undefined;
  const config     = PIPELINE_CONFIG[order.status as OrderStatus];

  if (!nextStatus) return null;

  async function advance() {
    if (!nextStatus) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        onAdvanced(order.id, nextStatus);
      }
    } finally {
      setLoading(false);
    }
  }

  const nextConfig = PIPELINE_CONFIG[nextStatus];

  return (
    <button
      onClick={advance}
      disabled={loading}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
        "ring-1 disabled:opacity-50 disabled:cursor-not-allowed",
        nextConfig.bg, nextConfig.text, nextConfig.ring,
        "hover:brightness-110"
      )}
    >
      {loading ? (
        <RefreshCw size={11} className="animate-spin" />
      ) : (
        <ChevronRight size={11} />
      )}
      {config.nextLabel}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Order Card
// ---------------------------------------------------------------------------

function OrderCard({
  order,
  isNew,
  onAdvanced,
}: {
  order:      Order;
  isNew:      boolean;
  onAdvanced: (orderId: string, newStatus: OrderStatus) => void;
}) {
  const cfg         = PIPELINE_CONFIG[order.status as OrderStatus] ?? PIPELINE_CONFIG.received;
  const hasNotes    = Boolean(order.specialNotes?.trim());
  const notesConcern = hasAllergenConcern(order.specialNotes);

  // Check any item special instructions for allergen flags
  const itemFlags = order.items.filter(
    (item) => hasAllergenConcern(item.specialInst) || item.dish.allergens.length > 0
  );

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-ra-surface overflow-hidden",
        "transition-all duration-300",
        isNew && "ring-2 ring-ra-accent/60 shadow-lg shadow-ra-accent/10",
        !isNew && "border-ra-border"
      )}
      style={isNew ? { animation: "slideInCard 0.4s ease-out" } : undefined}
    >
      {/* Left colour stripe */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", cfg.stripe)} />

      <div className="pl-4 pr-4 py-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Table badge */}
            <span className="flex items-center gap-1 rounded-lg bg-ra-bg border border-ra-border px-2.5 py-1 text-xs font-bold text-ra-text">
              <Utensils size={10} className="text-ra-muted" />
              Table {order.table.number}
            </span>
            {/* Order number */}
            <span className="text-xs font-mono text-ra-muted">#{order.orderNumber}</span>
            {/* Time */}
            <span className="flex items-center gap-1 text-xs text-ra-muted">
              <Clock size={10} />
              {formatTimeAgo(new Date(order.createdAt))}
            </span>
            {/* New badge */}
            {isNew && (
              <span className="rounded-full bg-ra-accent px-2 py-0.5 text-[10px] font-bold text-stone-900 uppercase tracking-wide">
                New
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <OrderStatusBadge status={order.status as OrderStatus} />
            {/* POS indicator */}
            {order.posSynced ? (
              <span title="POS synced">
                <Wifi size={13} className="text-green-400" />
              </span>
            ) : (
              <span title="Not synced to POS">
                <WifiOff size={13} className="text-ra-muted/30" />
              </span>
            )}
          </div>
        </div>

        {/* Item chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {order.items.map((item) => {
            const itemConcern = hasAllergenConcern(item.specialInst);
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs border",
                  itemConcern
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                    : "bg-ra-bg border-ra-border/60 text-ra-text"
                )}
              >
                {item.dish.imageEmoji && (
                  <span className="text-sm leading-none">{item.dish.imageEmoji}</span>
                )}
                <span className="font-medium">{item.quantity}×</span>
                <span>{item.dish.name}</span>
                {item.dish.isVeg && !item.dish.isVegan && (
                  <span className="w-3 h-3 rounded-sm border border-green-500 flex items-center justify-center shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  </span>
                )}
                {item.dish.isVegan && (
                  <span className="text-[9px] rounded bg-green-500/20 text-green-400 px-1">V+</span>
                )}
                {itemConcern && <AlertTriangle size={10} className="text-amber-400 shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Allergen flags summary */}
        {itemFlags.length > 0 && (
          <div className="mb-3 rounded-lg bg-amber-500/8 border border-amber-500/15 px-3 py-2">
            <div className="flex items-start gap-1.5">
              <AlertTriangle size={12} className="text-amber-400 mt-0.5 shrink-0" />
              <div className="text-[11px] text-amber-300 leading-relaxed">
                <span className="font-semibold">Allergen flags:</span>{" "}
                {itemFlags.map((item) => {
                  const parts: string[] = [];
                  if (item.dish.allergens.length > 0) parts.push(`${item.dish.name} contains ${item.dish.allergens.join(", ")}`);
                  if (hasAllergenConcern(item.specialInst)) parts.push(`special note on ${item.dish.name}`);
                  return parts.join("; ");
                }).join(" · ")}
              </div>
            </div>
          </div>
        )}

        {/* Special notes */}
        {hasNotes && (
          <div className={cn(
            "mb-3 rounded-lg px-3 py-2 text-xs border",
            notesConcern
              ? "bg-red-500/8 border-red-500/20 text-red-300"
              : "bg-ra-bg border-ra-border/60 text-ra-muted"
          )}>
            <div className="flex items-start gap-1.5">
              {notesConcern && <AlertTriangle size={10} className="text-red-400 mt-0.5 shrink-0" />}
              <span className="leading-relaxed">{order.specialNotes}</span>
            </div>
          </div>
        )}

        {/* Individual item special instructions */}
        {order.items.some((i) => i.specialInst?.trim()) && (
          <div className="mb-3 space-y-1">
            {order.items
              .filter((i) => i.specialInst?.trim())
              .map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] border",
                    hasAllergenConcern(item.specialInst)
                      ? "bg-amber-500/8 border-amber-500/15 text-amber-300"
                      : "bg-ra-bg border-ra-border/40 text-ra-muted"
                  )}
                >
                  {hasAllergenConcern(item.specialInst) && (
                    <AlertTriangle size={10} className="text-amber-400 mt-0.5 shrink-0" />
                  )}
                  <span className="font-medium text-ra-text/80">{item.dish.name}:</span>
                  <span>{item.specialInst}</span>
                </div>
              ))}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between pt-2 border-t border-ra-border/40">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-display font-bold text-ra-accent">
              {formatCurrency(order.total)}
            </span>
            {order.discount > 0 && (
              <span className="text-xs text-green-400">
                −{formatCurrency(order.discount)} off
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {order.status === "served" && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 size={12} /> Served
              </span>
            )}
            <AdvanceStatusButton order={order} onAdvanced={onAdvanced} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline Summary Cards (top row)
// ---------------------------------------------------------------------------

function PipelineCard({
  status,
  count,
  isActive,
  onClick,
}: {
  status:   OrderStatus;
  count:    number;
  isActive: boolean;
  onClick:  () => void;
}) {
  const cfg = PIPELINE_CONFIG[status];
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 rounded-2xl border p-4 text-left transition-all duration-200",
        "hover:border-current/30 hover:shadow-md hover:shadow-black/20",
        isActive
          ? cn("border-current/30 shadow-md shadow-black/20", cfg.bg)
          : "border-ra-border bg-ra-surface"
      )}
    >
      <div className={cn("text-3xl font-display font-bold leading-none mb-1", cfg.text)}>
        {count}
      </div>
      <div className="text-sm text-ra-muted">{cfg.label}</div>
      <div className={cn("mt-2 h-1 rounded-full", isActive ? cfg.stripe : "bg-ra-border/40")} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export function OrdersPageClient({ initialOrders }: OrdersPageClientProps) {
  const router  = useRouter();
  const [, startTransition] = useTransition();

  // Local optimistic state — starts with server-rendered data
  const [orders,     setOrders]     = useState<Order[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [newIds,     setNewIds]     = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Export state
  const today   = new Date().toISOString().slice(0, 10);
  const ago30   = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const [exportOpen,    setExportOpen]    = useState(false);
  const [exportFrom,    setExportFrom]    = useState(ago30);
  const [exportTo,      setExportTo]      = useState(today);
  const [exporting,     setExporting]     = useState(false);

  function handleExport() {
    setExporting(true);
    const url = `/api/orders/export?from=${exportFrom}&to=${exportTo}`;
    const a   = document.createElement("a");
    a.href    = url;
    a.click();
    setTimeout(() => setExporting(false), 1500);
  }

  const prevOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-refresh every 5 seconds via router.refresh()
  useEffect(() => {
    function scheduleRefresh() {
      timerRef.current = setTimeout(() => {
        startTransition(() => router.refresh());
        scheduleRefresh();
      }, 5000);
    }
    scheduleRefresh();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router]);

  // Detect new orders when server pushes fresh props
  useEffect(() => {
    const incoming = new Set(initialOrders.map((o) => o.id));
    const fresh: string[] = [];
    for (const id of incoming) {
      if (!prevOrderIdsRef.current.has(id)) fresh.push(id);
    }
    if (fresh.length > 0) {
      setNewIds((prev) => new Set([...prev, ...fresh]));
      playNewOrderSound();
      // Clear "new" highlight after 8 seconds
      setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          fresh.forEach((id) => next.delete(id));
          return next;
        });
      }, 8000);
    }
    prevOrderIdsRef.current = incoming;
    setOrders(initialOrders);
    setLastRefresh(new Date());
  }, [initialOrders]);

  // Optimistic status advance
  const handleAdvanced = useCallback((orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o)
    );
    // Also trigger server refresh after 1s to confirm
    setTimeout(() => startTransition(() => router.refresh()), 1000);
  }, [router]);

  // Manual refresh button
  const handleManualRefresh = useCallback(() => {
    setRefreshing(true);
    startTransition(() => router.refresh());
    setTimeout(() => setRefreshing(false), 800);
  }, [router]);

  // Derived counts
  const counts = {
    received:  orders.filter((o) => o.status === "received").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready:     orders.filter((o) => o.status === "ready").length,
    served:    orders.filter((o) => o.status === "served").length,
  };

  const activeCount = counts.received + counts.preparing + counts.ready;

  // Filter
  const visible = statusFilter === "all"
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  // Sort: active first (received → preparing → ready), then served; within same status by time asc
  const sorted = [...visible].sort((a, b) => {
    const ai = STATUS_PIPELINE.indexOf(a.status as OrderStatus);
    const bi = STATUS_PIPELINE.indexOf(b.status as OrderStatus);
    if (ai !== bi) return ai - bi;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <>
      {/* Keyframe animation — injected as style tag */}
      <style>{`
        @keyframes slideInCard {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-ra-text">Live Orders</h1>
            <p className="text-sm text-ra-muted mt-0.5">
              {activeCount} active · refreshed {formatTimeAgo(lastRefresh)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExportOpen((o) => !o)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                exportOpen
                  ? "border-ra-accent/50 bg-ra-accent/10 text-ra-accent"
                  : "border-ra-border text-ra-muted hover:text-ra-text hover:border-ra-accent/40"
              )}
            >
              <Download size={13} />
              Export CSV
            </button>
            <button
              onClick={handleManualRefresh}
              className={cn(
                "rounded-lg p-2 text-ra-muted hover:bg-white/5 hover:text-ra-text transition-all",
                refreshing && "animate-spin text-ra-accent"
              )}
              title="Refresh now"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Export panel */}
        {exportOpen && (
          <div className="rounded-xl border border-ra-accent/30 bg-ra-surface p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-ra-muted mb-1">From</label>
              <input
                type="date"
                value={exportFrom}
                max={exportTo}
                onChange={(e) => setExportFrom(e.target.value)}
                className="rounded-lg border border-ra-border bg-ra-bg px-3 py-1.5 text-sm text-ra-text focus:outline-none focus:ring-2 focus:ring-ra-accent/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ra-muted mb-1">To</label>
              <input
                type="date"
                value={exportTo}
                min={exportFrom}
                max={today}
                onChange={(e) => setExportTo(e.target.value)}
                className="rounded-lg border border-ra-border bg-ra-bg px-3 py-1.5 text-sm text-ra-text focus:outline-none focus:ring-2 focus:ring-ra-accent/30"
              />
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-lg bg-ra-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
            >
              <Download size={14} />
              {exporting ? "Downloading…" : "Download CSV"}
            </button>
            <button
              onClick={() => setExportOpen(false)}
              className="ml-auto rounded-lg p-1.5 text-ra-muted hover:text-ra-text"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Pipeline summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATUS_PIPELINE.map((s) => (
            <PipelineCard
              key={s}
              status={s}
              count={counts[s]}
              isActive={statusFilter === s}
              onClick={() => setStatusFilter((prev) => prev === s ? "all" : s)}
            />
          ))}
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
              statusFilter === "all"
                ? "bg-ra-accent text-stone-900"
                : "text-ra-muted hover:bg-white/5 hover:text-ra-text"
            )}
          >
            All ({orders.length})
          </button>
          {STATUS_PIPELINE.map((s) => {
            const cfg = PIPELINE_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter((prev) => prev === s ? "all" : s)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
                  statusFilter === s
                    ? cn(cfg.bg, cfg.text, "ring-1", cfg.ring)
                    : "text-ra-muted hover:bg-white/5 hover:text-ra-text"
                )}
              >
                {cfg.label}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  statusFilter === s ? "bg-black/20" : "bg-white/10"
                )}>
                  {counts[s]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Order list */}
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="text-ra-text font-medium">
              {statusFilter === "all" ? "No orders yet today" : `No ${statusFilter} orders`}
            </p>
            <p className="text-sm text-ra-muted mt-1">
              {statusFilter === "all"
                ? "Orders will appear here as soon as customers place them."
                : "Change the filter to see other orders."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isNew={newIds.has(order.id)}
                onAdvanced={handleAdvanced}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
