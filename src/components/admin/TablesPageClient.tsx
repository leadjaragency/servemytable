"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Users, QrCode, MessageSquare, ChevronRight, X,
  Clock, Utensils, Trash2, UserCheck, RefreshCw, RotateCcw,
  Gamepad2, Receipt, Link2, Link2Off, Crown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TableStatusBadge, OrderStatusBadge } from "@/components/ui/StatusBadge";
import { Select } from "@/components/ui/Select";
import { cn, formatTimeAgo, formatCurrency } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";

// ---------------------------------------------------------------------------
// Notification beep — Web Audio API (no file dependency)
// ---------------------------------------------------------------------------

function playNotificationBeep() {
  try {
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch { /* AudioContext unavailable in some environments */ }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Waiter {
  id:     string;
  name:   string;
  avatar: string;
}

interface OrderItem {
  id:       string;
  quantity: number;
  dish:     { name: string };
}

interface Order {
  id:          string;
  orderNumber: string;
  status:      string;
  total:       number;
  createdAt:   string;
  items:       OrderItem[];
}

interface Session {
  id:           string;
  guestCount:   number | null;
  startedAt:    string;
  dietaryPrefs: string[];
}

interface MergeRef {
  id:     string;
  number: number;
}

interface Table {
  id:           string;
  number:       number;
  seats:        number;
  status:       string;
  qrCode:       string | null;
  waiter:       Waiter | null;
  mergedIntoId: string | null;
  mergedInto:   MergeRef | null;
  mergedTables: MergeRef[];
  orders:       Order[];
  sessions:     Session[];
  restaurantId: string;
  createdAt:    string;
  updatedAt:    string;
}

// Detail types — loaded from GET /api/tables/[id] on slide-over open

interface DetailedOrderItem {
  id:          string;
  quantity:    number;
  unitPrice:   number;
  specialInst: string | null;
  dish:        { name: string; price: number; imageEmoji: string | null };
}

interface DetailedOrder {
  id:           string;
  orderNumber:  string;
  status:       string;
  subtotal:     number;
  tax:          number;
  discount:     number;
  total:        number;
  specialNotes: string | null;
  createdAt:    string;
  items:        DetailedOrderItem[];
}

interface GameResult {
  id:          string;
  gameType:    string;
  prize:       string | null;
  discountPct: number | null;
  won:         boolean;
  createdAt:   string;
}

interface DetailedSession {
  id:           string;
  guestCount:   number | null;
  startedAt:    string;
  dietaryPrefs: string[];
  discount:     number | null;
  orders:       DetailedOrder[];
}

interface TableDetail {
  sessions:    DetailedSession[];
  gameResults: GameResult[];
}

type TableStatus = "all" | "occupied" | "ordering" | "billing" | "empty";

export interface TablesPageClientProps {
  tables:         Table[];
  waiters:        Waiter[];
  restaurantSlug: string;
}

// ---------------------------------------------------------------------------
// Status colours (card left border accent)
// ---------------------------------------------------------------------------

const statusAccent: Record<string, string> = {
  empty:    "border-l-ra-border",
  occupied: "border-l-blue-500",
  ordering: "border-l-amber-500",
  billing:  "border-l-green-500",
};

// ---------------------------------------------------------------------------
// Add Table Modal
// ---------------------------------------------------------------------------

function AddTableModal({
  waiters,
  onClose,
}: {
  waiters: Waiter[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [number,   setNumber]   = useState("");
  const [seats,    setSeats]    = useState("4");
  const [waiterId, setWaiterId] = useState<string>("none");
  const [error,    setError]    = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!number || isNaN(Number(number)) || Number(number) < 1) {
      setError("Table number must be a positive integer.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tables", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          number:   Number(number),
          seats:    Number(seats),
          waiterId: waiterId === "none" ? null : waiterId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create table.");
      }
      onClose();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  const waiterOptions = [
    { value: "none", label: "No waiter assigned" },
    ...waiters.map((w) => ({ value: w.id, label: `${w.avatar} ${w.name}` })),
  ];

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Add New Table"
      description="Add a table to your floor plan. Assign a QR code from the QR Codes page after creation."
      contentClassName="bg-ra-surface border-ra-border text-ra-text"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-red-400">{error ?? ""}</div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button
              variant="amber"
              size="sm"
              loading={saving}
              onClick={handleSubmit as unknown as React.MouseEventHandler}
            >
              Add Table
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ra-text mb-1">
              Table Number *
            </label>
            <input
              type="number"
              min="1"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. 12"
              className="w-full rounded-lg border border-ra-border bg-ra-bg px-3 py-2 text-sm text-ra-text placeholder:text-ra-muted/50 focus:border-ra-accent/50 focus:outline-none focus:ring-1 focus:ring-ra-accent/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ra-text mb-1">
              Seats
            </label>
            <select
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className="w-full rounded-lg border border-ra-border bg-ra-bg px-3 py-2 text-sm text-ra-text focus:border-ra-accent/50 focus:outline-none focus:ring-1 focus:ring-ra-accent/30"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                <option key={n} value={n}>{n} seats</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ra-text mb-1">
            Assign AI Waiter
          </label>
          <Select
            value={waiterId}
            onValueChange={(v) => setWaiterId(v || "none")}
            options={waiterOptions}
            placeholder="No waiter assigned"
          />
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirmation Modal
// ---------------------------------------------------------------------------

function DeleteTableModal({
  table,
  onClose,
}: {
  table:   Table;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error,    setError]    = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tables/${table.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to delete table.");
      }
      onClose();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
      setDeleting(false);
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Delete Table ${table.number}?`}
      description="This action cannot be undone. Only empty tables can be deleted."
      contentClassName="bg-ra-surface border-ra-border text-ra-text"
      size="sm"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-red-400">{error ?? ""}</div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={deleting}>Cancel</Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      }
    >
      <p className="text-sm text-ra-muted">
        Table <span className="font-semibold text-ra-text">#{table.number}</span> ({table.seats} seats)
        will be permanently removed from your floor plan.
      </p>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Reset Table Confirmation Modal
// ---------------------------------------------------------------------------

function ResetTableModal({
  table,
  onClose,
}: {
  table:   Table;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error,     setError]     = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tables/${table.id}/reset`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to reset table.");
      }
      onClose();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
      setResetting(false);
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Reset Table ${table.number}?`}
      description="Use this when a table is stuck as occupied but the customers have left."
      contentClassName="bg-ra-surface border-ra-border text-ra-text"
      size="sm"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-red-400">{error ?? ""}</div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={resetting}>Cancel</Button>
            <Button variant="amber" size="sm" loading={resetting} onClick={handleReset}
              leftIcon={<RotateCcw size={13} />}>
              Reset to Empty
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-ra-muted">
          Table <span className="font-semibold text-ra-text">#{table.number}</span> is currently{" "}
          <span className="font-semibold text-ra-text">{table.status}</span>. Resetting it will:
        </p>
        <ul className="space-y-1.5 text-sm text-ra-muted">
          <li className="flex items-center gap-2">
            <span className="text-ra-accent">·</span> Set status back to <span className="text-ra-text font-medium">Empty</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-ra-accent">·</span> Close any open customer session
          </li>
          <li className="flex items-center gap-2">
            <span className="text-ra-accent">·</span> The AI waiter will be ready for new customers
          </li>
        </ul>
        <p className="text-xs text-ra-muted/60 pt-1">
          Existing orders and chat history are preserved.
        </p>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Merge Tables Modal
// ---------------------------------------------------------------------------

function MergeTablesModal({
  tables,
  onClose,
}: {
  tables:  Table[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [primaryId,     setPrimaryId]     = useState<string>("");
  const [error,         setError]         = useState<string | null>(null);
  const [merging,       setMerging]       = useState(false);

  // Only show tables that are empty and not already merged into something
  const eligible = tables.filter(
    (t) => t.status === "empty" && !t.mergedIntoId && t.mergedTables.length === 0
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (primaryId === id) setPrimaryId("");
      } else {
        next.add(id);
        if (!primaryId) setPrimaryId(id);
      }
      return next;
    });
    setError(null);
  }

  const selectedArr = [...selectedIds];
  const canMerge    = selectedArr.length >= 2 && !!primaryId;

  async function handleMerge() {
    if (!canMerge) return;
    setMerging(true);
    setError(null);
    try {
      const secondaryIds = selectedArr.filter((id) => id !== primaryId);
      const res = await fetch("/api/tables/merge", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ primaryTableId: primaryId, secondaryTableIds: secondaryIds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to merge tables.");
      }
      const primary = tables.find((t) => t.id === primaryId);
      const secondary = tables.filter((t) => secondaryIds.includes(t.id));
      toast.success(
        `Tables ${[primary, ...secondary].map((t) => `T${t?.number}`).join(" + ")} merged successfully.`
      );
      onClose();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setMerging(false);
    }
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Merge Tables"
      description="Combine tables so a large group shares one session and one combined order."
      contentClassName="bg-ra-surface border-ra-border text-ra-text"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-red-400">{error ?? ""}</div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={merging}>Cancel</Button>
            <Button
              variant="amber"
              size="sm"
              loading={merging}
              disabled={!canMerge}
              onClick={handleMerge}
              leftIcon={<Link2 size={13} />}
            >
              Merge {selectedArr.length >= 2 ? `${selectedArr.length} Tables` : "Tables"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {eligible.length < 2 ? (
          <p className="text-sm text-ra-muted text-center py-4">
            You need at least 2 empty, unmerged tables to merge. Tables must be empty before merging.
          </p>
        ) : (
          <>
            <p className="text-xs text-ra-muted">
              Select 2 or more tables, then choose which one is the <strong className="text-ra-text">primary</strong> (the one that holds the session and orders).
              Customers scanning any merged table&apos;s QR will join the same session.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {eligible.map((t) => {
                const isSelected = selectedIds.has(t.id);
                const isPrimary  = primaryId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleSelect(t.id)}
                    className={cn(
                      "relative rounded-xl border-2 p-3 text-left transition-all",
                      isSelected
                        ? "border-ra-accent bg-ra-accent/10"
                        : "border-ra-border bg-ra-bg hover:border-ra-accent/40"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-ra-accent flex items-center justify-center">
                        <span className="text-[9px] text-black font-bold">✓</span>
                      </span>
                    )}
                    <div className="text-xl font-display font-bold text-ra-text">{t.number}</div>
                    <div className="text-[10px] text-ra-muted mt-0.5">{t.seats} seats</div>
                    {t.waiter && (
                      <div className="text-[10px] text-ra-muted truncate">{t.waiter.avatar} {t.waiter.name}</div>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedArr.length >= 2 && (
              <div>
                <p className="text-xs font-medium text-ra-text mb-2">
                  Which table is the primary? <span className="text-ra-muted font-normal">(holds the combined session)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedArr.map((id) => {
                    const t = tables.find((x) => x.id === id)!;
                    return (
                      <button
                        key={id}
                        onClick={() => setPrimaryId(id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all",
                          primaryId === id
                            ? "border-ra-accent bg-ra-accent/10 text-ra-text"
                            : "border-ra-border text-ra-muted hover:border-ra-accent/40"
                        )}
                      >
                        {primaryId === id && <Crown size={11} className="text-ra-accent" />}
                        Table {t.number}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Unmerge Confirmation Modal
// ---------------------------------------------------------------------------

function UnmergeModal({
  primaryTable,
  onClose,
}: {
  primaryTable: Table;
  onClose:      () => void;
}) {
  const router = useRouter();
  const [error,      setError]      = useState<string | null>(null);
  const [unmerging,  setUnmerging]  = useState(false);

  const allNonEmpty = [primaryTable, ...primaryTable.mergedTables.map((m) => ({
    ...m, status: "unknown",
  }))].filter((t) => "status" in t && (t as Table).status !== "empty");

  async function handleUnmerge(force = false) {
    setUnmerging(true);
    setError(null);
    try {
      const res = await fetch("/api/tables/merge", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ primaryTableId: primaryTable.id, force }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to unmerge tables.");
      }
      toast.success(`Tables unmerged. Each table is now independent again.`);
      onClose();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setUnmerging(false);
    }
  }

  const groupNums = [primaryTable.number, ...primaryTable.mergedTables.map((m) => m.number)]
    .sort((a, b) => a - b)
    .map((n) => `T${n}`)
    .join(" + ");

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Unmerge Table Group"
      description={`Split ${groupNums} back into independent tables.`}
      contentClassName="bg-ra-surface border-ra-border text-ra-text"
      size="sm"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-red-400">{error ?? ""}</div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={unmerging}>Cancel</Button>
            {primaryTable.status !== "empty" ? (
              <Button variant="danger" size="sm" loading={unmerging} onClick={() => handleUnmerge(true)}>
                Force Unmerge
              </Button>
            ) : (
              <Button variant="amber" size="sm" loading={unmerging} onClick={() => handleUnmerge(false)}
                leftIcon={<Link2Off size={13} />}>
                Unmerge
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-ra-muted">
        <p>
          This will separate{" "}
          <span className="font-semibold text-ra-text">{groupNums}</span> back into
          individual tables. Each will have its own independent session going forward.
        </p>
        {allNonEmpty.length > 0 && primaryTable.status !== "empty" && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-400 text-xs">
            ⚠ Table {primaryTable.number} is currently active. Force unmerge will separate the tables but the active session remains on Table {primaryTable.number}.
          </div>
        )}
        <p className="text-xs text-ra-muted/60">
          Existing orders and chat history are preserved.
        </p>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Table Slide-Over Panel
// ---------------------------------------------------------------------------

function TableSlideOver({
  table,
  waiters,
  detail,
  detailLoading,
  onClose,
  onReset,
  onUnmerge,
}: {
  table:         Table;
  waiters:       Waiter[];
  detail:        TableDetail | null;
  detailLoading: boolean;
  onClose:       () => void;
  onReset:       () => void;
  onUnmerge:     () => void;
}) {
  const router = useRouter();

  // Use detail session when loaded; fall back to basic session from polling data
  const basicSession  = table.sessions[0] ?? null;
  const activeSession = detail?.sessions[0] ?? basicSession;
  const sessionOrders = detail?.sessions[0]?.orders ?? [];
  const gameResults   = detail?.gameResults ?? [];

  // Bill totals derived from all session orders
  const billSubtotal = sessionOrders.reduce((s, o) => s + o.subtotal, 0);
  const billTax      = sessionOrders.reduce((s, o) => s + o.tax, 0);
  const billDiscount = sessionOrders.reduce((s, o) => s + o.discount, 0)
                       + (detail?.sessions[0]?.discount ?? 0);
  const billTotal    = billSubtotal + billTax - billDiscount;

  const [assigningWaiter, setAssigningWaiter] = useState(false);
  const [selectedWaiter,  setSelectedWaiter]  = useState(table.waiter?.id ?? "none");
  const [waiterError,     setWaiterError]     = useState<string | null>(null);

  async function handleReassignWaiter() {
    setAssigningWaiter(true);
    setWaiterError(null);
    try {
      const res = await fetch(`/api/tables/${table.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ waiterId: selectedWaiter === "none" ? null : selectedWaiter }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to update waiter.");
      }
      router.refresh();
    } catch (err: unknown) {
      setWaiterError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setAssigningWaiter(false);
    }
  }

  const waiterOptions = [
    { value: "none", label: "No waiter" },
    ...waiters.map((w) => ({ value: w.id, label: `${w.avatar} ${w.name}` })),
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-ra-surface border-l border-ra-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ra-border">
          <div>
            <h2 className="font-display text-xl font-semibold text-ra-text">
              Table {table.number}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <TableStatusBadge status={table.status as "empty" | "occupied" | "ordering" | "billing"} />
              <span className="text-xs text-ra-muted flex items-center gap-1">
                <Users size={11} />
                {table.seats} seats
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 opacity-50 hover:opacity-100 hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Merge group info ───────────────────────────────────── */}
          {(table.mergedIntoId || table.mergedTables.length > 0) && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ra-muted mb-3 flex items-center gap-1.5">
                <Link2 size={12} /> Table Group
              </h3>
              <div className="rounded-xl border border-ra-accent/30 bg-ra-accent/5 p-4 space-y-2 text-sm">
                {table.mergedIntoId ? (
                  <p className="text-ra-muted">
                    This table is <span className="text-ra-text font-semibold">merged into Table {table.mergedInto?.number}</span>.
                    Customers scanning this QR join Table {table.mergedInto?.number}&apos;s session automatically.
                  </p>
                ) : (
                  <>
                    <p className="text-ra-muted">
                      <Crown size={12} className="inline text-ra-accent mr-1" />
                      <span className="text-ra-text font-semibold">Primary table</span> for a merged group.
                    </p>
                    <p className="text-ra-muted text-xs">
                      Merged with:{" "}
                      <span className="text-ra-text font-medium">
                        {table.mergedTables.map((m) => `T${m.number}`).join(", ")}
                      </span>
                    </p>
                  </>
                )}
              </div>
            </section>
          )}

          {/* ── Active session info ────────────────────────────────── */}
          {activeSession && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ra-muted mb-3">
                Active Session
              </h3>
              <div className="rounded-xl border border-ra-border bg-ra-bg p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ra-muted">Started</span>
                  <span className="text-ra-text">{formatTimeAgo(new Date(activeSession.startedAt))}</span>
                </div>
                {activeSession.guestCount && (
                  <div className="flex items-center justify-between">
                    <span className="text-ra-muted">Guests</span>
                    <span className="text-ra-text">{activeSession.guestCount}</span>
                  </div>
                )}
                {activeSession.dietaryPrefs.length > 0 && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-ra-muted shrink-0">Dietary</span>
                    <span className="text-ra-text text-right">
                      {activeSession.dietaryPrefs.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── All session orders ─────────────────────────────────── */}
          {activeSession && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ra-muted mb-3">
                Orders This Session
              </h3>
              {detailLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-ra-bg animate-pulse border border-ra-border" />
                  ))}
                </div>
              ) : sessionOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ra-border/40 bg-ra-bg/40 px-4 py-3 text-center">
                  <p className="text-xs text-ra-muted/50">No orders placed yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessionOrders.map((order) => (
                    <div key={order.id} className="rounded-xl border border-ra-border bg-ra-bg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-ra-text">#{order.orderNumber}</span>
                        <OrderStatusBadge status={order.status as "received" | "preparing" | "ready" | "served"} />
                      </div>
                      <ul className="space-y-0.5">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex items-center justify-between text-xs text-ra-muted">
                            <span>
                              {item.dish.imageEmoji ? `${item.dish.imageEmoji} ` : ""}
                              {item.quantity}× {item.dish.name}
                            </span>
                            <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                          </li>
                        ))}
                      </ul>
                      {order.specialNotes && (
                        <p className="text-xs text-ra-muted/60 italic">Note: {order.specialNotes}</p>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-ra-border/60">
                        <span className="text-xs text-ra-muted">{formatTimeAgo(new Date(order.createdAt))}</span>
                        <span className="text-sm font-semibold text-ra-text">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Games & Rewards ────────────────────────────────────── */}
          {activeSession && !detailLoading && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ra-muted mb-3 flex items-center gap-1.5">
                <Gamepad2 size={12} /> Games & Rewards
              </h3>
              {gameResults.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ra-border/40 bg-ra-bg/40 px-4 py-3 text-center">
                  <p className="text-xs text-ra-muted/50">No games played yet</p>
                </div>
              ) : (
                <div className="rounded-xl border border-ra-border bg-ra-bg p-4 space-y-2">
                  {gameResults.map((g) => (
                    <div key={g.id} className="flex items-center justify-between text-sm">
                      <span className="text-ra-muted capitalize">
                        {g.gameType.replace(/_/g, " ")}
                      </span>
                      <span className={cn(
                        "text-xs font-medium rounded-full px-2 py-0.5",
                        g.won
                          ? "bg-green-500/15 text-green-400"
                          : "bg-ra-border/60 text-ra-muted"
                      )}>
                        {g.won ? (g.prize ?? `${g.discountPct}% OFF`) : "No win"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Bill Summary ───────────────────────────────────────── */}
          {activeSession && !detailLoading && sessionOrders.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ra-muted mb-3 flex items-center gap-1.5">
                <Receipt size={12} /> Bill Summary
              </h3>
              <div className="rounded-xl border border-ra-border bg-ra-bg p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-ra-muted">
                  <span>Subtotal</span>
                  <span>{formatCurrency(billSubtotal)}</span>
                </div>
                <div className="flex justify-between text-ra-muted">
                  <span>Tax</span>
                  <span>{formatCurrency(billTax)}</span>
                </div>
                {billDiscount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount</span>
                    <span>- {formatCurrency(billDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-ra-text pt-1.5 border-t border-ra-border">
                  <span>Total</span>
                  <span>{formatCurrency(Math.max(0, billTotal))}</span>
                </div>
              </div>
            </section>
          )}

          {/* ── Chat transcript link ───────────────────────────────── */}
          {activeSession && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ra-muted mb-3">
                Chat Transcript
              </h3>
              <div className="rounded-xl border border-ra-border bg-ra-bg px-4 py-3 text-sm text-ra-muted flex items-center justify-between">
                <span>View this session&apos;s conversation</span>
                <ChevronRight size={14} className="text-ra-muted/50" />
              </div>
            </section>
          )}

          {/* ── Reassign waiter ────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ra-muted mb-3">
              AI Waiter
            </h3>
            <div className="space-y-3">
              <Select
                value={selectedWaiter}
                onValueChange={setSelectedWaiter}
                options={waiterOptions}
                placeholder="No waiter assigned"
              />
              {waiterError && <p className="text-xs text-red-400">{waiterError}</p>}
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                loading={assigningWaiter}
                disabled={selectedWaiter === (table.waiter?.id ?? "none")}
                onClick={handleReassignWaiter}
                leftIcon={<UserCheck size={14} />}
              >
                {assigningWaiter ? "Saving…" : "Save Waiter Assignment"}
              </Button>
            </div>
          </section>

          {/* ── Quick links ────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ra-muted mb-3">
              Quick Links
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/admin/qr-codes"
                className="flex items-center gap-2 rounded-xl border border-ra-border bg-ra-bg px-4 py-3 text-sm text-ra-text hover:border-ra-accent/40 hover:bg-white/5 transition-colors"
              >
                <QrCode size={15} className="text-ra-muted" />
                QR Codes
              </Link>
              <Link
                href="/admin/orders"
                className="flex items-center gap-2 rounded-xl border border-ra-border bg-ra-bg px-4 py-3 text-sm text-ra-text hover:border-ra-accent/40 hover:bg-white/5 transition-colors"
              >
                <Utensils size={15} className="text-ra-muted" />
                Live Orders
              </Link>
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-ra-border flex items-center justify-between">
          <span className="text-xs text-ra-muted">
            <Clock size={11} className="inline mr-1" />
            Updated {formatTimeAgo(new Date(table.updatedAt))}
          </span>
          <div className="flex gap-2">
            {/* Unmerge button — only on the primary table */}
            {table.mergedTables.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-ra-accent hover:bg-ra-accent/10 gap-1.5 text-xs"
                onClick={onUnmerge}
                title="Unmerge table group"
              >
                <Link2Off size={13} />
                Unmerge
              </Button>
            )}
            {table.status !== "empty" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-400 hover:bg-amber-500/10 gap-1.5 text-xs"
                onClick={onReset}
                title="Reset stuck table to empty"
              >
                <RotateCcw size={13} />
                Reset Table
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-red-400 hover:bg-red-500/10"
              onClick={onClose}
              title="Delete table"
            >
              <Trash2 size={15} />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Table Card
// ---------------------------------------------------------------------------

function TableCard({
  table,
  onSelect,
  onDelete,
}: {
  table:    Table;
  onSelect: (t: Table) => void;
  onDelete: (t: Table) => void;
}) {
  const isMergedSecondary = !!table.mergedIntoId;
  const isMergedPrimary   = table.mergedTables.length > 0;
  const isActive          = table.status !== "empty";
  const isBilling         = table.status === "billing";
  const latestOrder       = table.orders[0] ?? null;
  const itemSummary       = latestOrder?.items
    .map((i) => `${i.quantity}× ${i.dish.name}`)
    .join(", ");

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-ra-surface cursor-pointer group",
        "border-l-4 transition-all duration-200",
        "hover:border-ra-accent/40 hover:shadow-lg hover:shadow-black/20",
        isMergedSecondary
          ? "border-l-ra-accent/60 opacity-80"
          : statusAccent[table.status] ?? "border-l-ra-border",
        isActive && !isMergedSecondary ? "border-ra-border/80" : "border-ra-border/40",
        isBilling && "ring-2 ring-green-500/60 animate-pulse"
      )}
      onClick={() => onSelect(table)}
    >
      {/* Delete button (top-right, visible on hover) */}
      {table.status === "empty" && !isMergedPrimary && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(table); }}
          className="absolute right-2 top-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all z-10"
          title="Delete table"
        >
          <Trash2 size={13} />
        </button>
      )}

      {/* Merge badge (top-right corner) */}
      {(isMergedSecondary || isMergedPrimary) && (
        <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-ra-accent/15 border border-ra-accent/30 px-1.5 py-0.5">
          {isMergedPrimary
            ? <Crown size={9} className="text-ra-accent" />
            : <Link2 size={9} className="text-ra-accent" />}
          <span className="text-[9px] font-medium text-ra-accent">
            {isMergedPrimary
              ? table.mergedTables.map((m) => `T${m.number}`).join("+")
              : `→T${table.mergedInto?.number}`}
          </span>
        </div>
      )}

      <div className="p-5">
        {/* Top row: number + status */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-3xl font-display font-bold text-ra-text leading-none">
              {table.number}
            </div>
            <div className="flex items-center gap-1 mt-1.5 text-ra-muted">
              <Users size={11} />
              <span className="text-xs">{table.seats} seats</span>
            </div>
          </div>
          {isMergedSecondary ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-ra-accent/10 border border-ra-accent/30 px-2 py-0.5 text-[10px] font-medium text-ra-accent">
              <Link2 size={9} /> Merged
            </span>
          ) : (
            <TableStatusBadge
              status={table.status as "empty" | "occupied" | "ordering" | "billing"}
            />
          )}
        </div>

        {/* Secondary merged: just show redirect info */}
        {isMergedSecondary ? (
          <div className="rounded-lg bg-ra-accent/5 border border-ra-accent/20 px-3 py-2 mb-3">
            <p className="text-[11px] text-ra-muted">
              Scans redirect to <span className="text-ra-accent font-medium">Table {table.mergedInto?.number}</span>&apos;s session
            </p>
          </div>
        ) : (
          <>
            {/* Waiter */}
            <div className="flex items-center gap-2 mb-3">
              {table.waiter ? (
                <>
                  <span className="text-base leading-none">{table.waiter.avatar}</span>
                  <span className="text-xs text-ra-muted truncate">{table.waiter.name}</span>
                </>
              ) : (
                <span className="text-xs text-ra-muted/50 italic">No waiter assigned</span>
              )}
            </div>

            {/* Order summary */}
            {latestOrder ? (
              <div className="rounded-lg bg-ra-bg border border-ra-border/60 px-3 py-2">
                <div className="flex items-center justify-between mb-0.5">
                  <OrderStatusBadge
                    status={latestOrder.status as "received" | "preparing" | "ready" | "served"}
                    className="text-[10px]"
                  />
                  <span className="text-xs font-medium text-ra-text">
                    ${latestOrder.total.toFixed(2)}
                  </span>
                </div>
                {itemSummary && (
                  <p className="text-[11px] text-ra-muted truncate mt-1">{itemSummary}</p>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-ra-bg/40 border border-dashed border-ra-border/40 px-3 py-2">
                <p className="text-[11px] text-ra-muted/40 text-center">
                  {isMergedPrimary ? `Group session (T${table.mergedTables.map((m) => m.number).join("+")})` : "No active order"}
                </p>
              </div>
            )}
          </>
        )}

        {/* Footer: QR + Chat buttons */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-ra-border/40">
          <Link
            href="/admin/qr-codes"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-ra-muted hover:bg-white/5 hover:text-ra-text transition-colors"
          >
            <QrCode size={11} /> QR
          </Link>
          {!isMergedSecondary && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(table); }}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-ra-muted hover:bg-white/5 hover:text-ra-text transition-colors"
            >
              <MessageSquare size={11} /> Chat log
            </button>
          )}
          <span className="ml-auto text-xs text-ra-muted/40">
            <Clock size={10} className="inline mr-0.5" />
            {formatTimeAgo(new Date(table.updatedAt))}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TablesPageClient({ tables: initialTables, waiters, restaurantSlug }: TablesPageClientProps) {
  const router = useRouter();

  const [tables,        setTables]        = useState<Table[]>(initialTables);
  const [filter,        setFilter]        = useState<TableStatus>("all");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [detail,        setDetail]        = useState<TableDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState<Table | null>(null);
  const [resetTarget,   setResetTarget]   = useState<Table | null>(null);
  const [unmergeTarget, setUnmergeTarget] = useState<Table | null>(null);
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);

  // ── Auto-polling every 10s ──────────────────────────────────────────────
  const { data: polledTables } = usePolling<Table[]>("/api/tables", {
    intervalMs: 10_000,
    onNewData: (next, prev) => {
      if (!prev) return;
      next.forEach((t) => {
        const before = prev.find((p) => p.id === t.id);
        if (before && before.status !== "billing" && t.status === "billing") {
          toast.info(`🔔 Table ${t.number} is requesting the payment machine!`, {
            duration: 10_000,
          });
          playNotificationBeep();
        }
      });
    },
  });

  useEffect(() => {
    if (!polledTables) return;
    setTables(polledTables);
    // Keep the slide-over's table data in sync with latest status
    setSelectedTable((prev) =>
      prev ? (polledTables.find((t) => t.id === prev.id) ?? prev) : null
    );
  }, [polledTables]);

  // ── Open slide-over + fetch detail ─────────────────────────────────────
  const handleSelectTable = useCallback(async (table: Table) => {
    setSelectedTable(table);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/tables/${table.id}`);
      if (res.ok) {
        setDetail(await res.json() as TableDetail);
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Counts and filtered list use live `tables` state (updated by polling)
  const counts = {
    all:      tables.length,
    occupied: tables.filter((t) => t.status === "occupied").length,
    ordering: tables.filter((t) => t.status === "ordering").length,
    billing:  tables.filter((t) => t.status === "billing").length,
    empty:    tables.filter((t) => t.status === "empty").length,
  };

  const filtered = filter === "all" ? tables : tables.filter((t) => t.status === filter);

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }, [router]);

  const handleDeleteFromSlideOver = useCallback(() => {
    if (selectedTable) {
      const t = selectedTable;
      setSelectedTable(null);
      setTimeout(() => setDeleteTarget(t), 150);
    }
  }, [selectedTable]);

  const handleResetFromSlideOver = useCallback(() => {
    if (selectedTable) {
      const t = selectedTable;
      setSelectedTable(null);
      setTimeout(() => setResetTarget(t), 150);
    }
  }, [selectedTable]);

  const handleUnmergeFromSlideOver = useCallback(() => {
    if (selectedTable) {
      const t = selectedTable;
      setSelectedTable(null);
      setTimeout(() => setUnmergeTarget(t), 150);
    }
  }, [selectedTable]);

  const FILTERS: { key: TableStatus; label: string }[] = [
    { key: "all",      label: "All" },
    { key: "occupied", label: "Occupied" },
    { key: "ordering", label: "Ordering" },
    { key: "billing",  label: "Billing" },
    { key: "empty",    label: "Empty" },
  ];

  void restaurantSlug;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ra-text">Floor Plan</h1>
          <p className="text-sm text-ra-muted mt-0.5">
            {counts.all} tables · {counts.all - counts.empty} active
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            className={cn(
              "rounded-lg p-2 text-ra-muted hover:bg-white/5 hover:text-ra-text transition-all",
              refreshing && "animate-spin text-ra-accent"
            )}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Link2 size={14} />}
            onClick={() => setShowMergeModal(true)}
          >
            Merge Tables
          </Button>
          <Button
            variant="amber"
            size="sm"
            leftIcon={<Plus size={15} />}
            onClick={() => setShowAddModal(true)}
          >
            Add Table
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
              filter === key
                ? "bg-ra-accent text-stone-900"
                : "text-ra-muted hover:bg-white/5 hover:text-ra-text"
            )}
          >
            {label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                filter === key
                  ? "bg-black/20 text-stone-900"
                  : "bg-white/10 text-ra-muted"
              )}
            >
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-4xl mb-4">🪑</div>
          <p className="text-ra-text font-medium">
            {filter === "all" ? "No tables yet" : `No ${filter} tables`}
          </p>
          <p className="text-sm text-ra-muted mt-1">
            {filter === "all"
              ? `Click "Add Table" to set up your floor plan.`
              : "Change the filter to see other tables."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onSelect={handleSelectTable}
              onDelete={setDeleteTarget}
            />
          ))}

          {/* Add table ghost card */}
          {filter === "all" && (
            <button
              onClick={() => setShowAddModal(true)}
              className={cn(
                "rounded-2xl border-2 border-dashed border-ra-border/40 p-5",
                "flex flex-col items-center justify-center gap-2 min-h-[180px]",
                "text-ra-muted/50 hover:text-ra-muted hover:border-ra-accent/40",
                "hover:bg-white/2 transition-all duration-200 cursor-pointer"
              )}
            >
              <Plus size={22} className="opacity-60" />
              <span className="text-xs font-medium">Add Table</span>
            </button>
          )}
        </div>
      )}

      {/* Slide-over */}
      {selectedTable && (
        <TableSlideOver
          table={selectedTable}
          waiters={waiters}
          detail={detail}
          detailLoading={detailLoading}
          onClose={() => { setSelectedTable(null); setDetail(null); }}
          onReset={handleResetFromSlideOver}
          onUnmerge={handleUnmergeFromSlideOver}
        />
      )}

      {/* Add modal */}
      {showAddModal && (
        <AddTableModal
          waiters={waiters}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Merge modal */}
      {showMergeModal && (
        <MergeTablesModal
          tables={tables}
          onClose={() => setShowMergeModal(false)}
        />
      )}

      {/* Unmerge modal */}
      {unmergeTarget && (
        <UnmergeModal
          primaryTable={unmergeTarget}
          onClose={() => setUnmergeTarget(null)}
        />
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteTableModal
          table={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* Reset modal */}
      {resetTarget && (
        <ResetTableModal
          table={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  );
}
