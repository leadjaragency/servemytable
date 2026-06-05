"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, Building2, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
} from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PendingRestaurant {
  id: string;
  name: string;
  cuisine: string;
  phone: string | null;
  address: string | null;
  createdAt: string;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
}

export interface Tier {
  id: string;
  name: string;
  monthlyPrice: number;
  maxTables: number;
  maxWaiters: number;
}

// ---------------------------------------------------------------------------
// Approve Modal
// ---------------------------------------------------------------------------

function ApproveModal({
  restaurant,
  tiers,
  onClose,
}: {
  restaurant: PendingRestaurant;
  tiers: Tier[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [tierId, setTierId] = useState(tiers[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    if (!tierId) { setError("Select a tier to continue."); return; }
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: restaurant.id, action: "approve", tierId }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error ?? "Failed to approve.");
      return;
    }

    onClose();
    router.refresh();
  }

  const selected = tiers.find((t) => t.id === tierId);

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Approve ${restaurant.name}`}
      description="Select a subscription tier. The restaurant owner will be activated immediately."
      contentClassName="bg-sa-surface border-sa-border text-sa-text"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          {tiers.map((t) => (
            <label
              key={t.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                tierId === t.id
                  ? "border-blue-400 bg-blue-500/15"
                  : "border-sa-border hover:bg-white/5"
              }`}
            >
              <input
                type="radio"
                name="tier"
                value={t.id}
                checked={tierId === t.id}
                onChange={() => setTierId(t.id)}
                className="mt-1 accent-indigo-500"
              />
              <div>
                <p className="font-medium text-sa-text">{t.name}</p>
                <p className="text-xs text-sa-muted mt-0.5">
                  ${t.monthlyPrice}/mo · {t.maxTables === -1 ? "Unlimited" : t.maxTables} tables ·{" "}
                  {t.maxWaiters === -1 ? "Unlimited" : t.maxWaiters} AI waiter
                  {t.maxWaiters !== 1 && t.maxWaiters !== -1 ? "s" : ""}
                </p>
              </div>
            </label>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <ModalFooter className="border-t border-sa-border">
        <Button variant="ghost" onClick={onClose} className="text-sa-muted">
          Cancel
        </Button>
        <Button
          variant="primary"
          loading={loading}
          onClick={approve}
          leftIcon={<CheckCircle2 className="h-4 w-4" />}
        >
          Approve & activate
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Reject Modal
// ---------------------------------------------------------------------------

function RejectModal({
  restaurant,
  onClose,
}: {
  restaurant: PendingRestaurant;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reject() {
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId: restaurant.id,
        action: "reject",
        rejectionReason: reason || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error ?? "Failed to reject.");
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Reject ${restaurant.name}`}
      description="The restaurant will be marked as disabled and the owner will not be able to log in."
      contentClassName="bg-sa-surface border-sa-border text-sa-text"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-sa-text/80 mb-1.5">
            Rejection reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Duplicate application, incomplete information…"
            rows={3}
            className="w-full rounded-lg border border-sa-border bg-sa-bg px-3 py-2 text-sm text-sa-text placeholder:text-sa-muted/50 focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
          />
          <p className="mt-1.5 text-xs text-sa-muted">
            This reason is for internal records only and is not sent to the applicant.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <ModalFooter className="border-t border-sa-border">
        <Button variant="ghost" onClick={onClose} className="text-sa-muted">
          Cancel
        </Button>
        <Button
          variant="danger"
          loading={loading}
          onClick={reject}
          leftIcon={<XCircle className="h-4 w-4" />}
        >
          Reject application
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Approval Card
// ---------------------------------------------------------------------------

function ApprovalCard({
  restaurant,
  tiers,
}: {
  restaurant: PendingRestaurant;
  tiers: Tier[];
}) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen]   = useState(false);
  const owner = restaurant.users[0];

  return (
    <>
      <div className="rounded-2xl border border-sa-border bg-sa-surface p-6 space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/150/10 text-lg font-bold text-amber-400">
              {restaurant.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-sa-text">
                {restaurant.name}
              </h3>
              <p className="text-sm text-sa-muted">{restaurant.cuisine}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/150/10 px-3 py-1 text-xs font-medium text-amber-400">
            <Clock className="h-3 w-3" />
            Pending
          </div>
        </div>

        {/* Details row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
          {owner && (
            <>
              <div>
                <p className="text-xs text-sa-muted mb-0.5">Owner name</p>
                <p className="font-medium text-sa-text">{owner.name}</p>
              </div>
              <div>
                <p className="text-xs text-sa-muted mb-0.5">Email</p>
                <a
                  href={`mailto:${owner.email}`}
                  className="flex items-center gap-1 font-medium text-sa-accent hover:underline"
                >
                  <Mail className="h-3 w-3" />
                  {owner.email}
                </a>
              </div>
            </>
          )}
          <div>
            <p className="text-xs text-sa-muted mb-0.5">Applied</p>
            <p className="font-medium text-sa-text">{formatDate(restaurant.createdAt)}</p>
          </div>
          {restaurant.phone && (
            <div>
              <p className="text-xs text-sa-muted mb-0.5">Phone</p>
              <p className="font-medium text-sa-text">{restaurant.phone}</p>
            </div>
          )}
          {restaurant.address && (
            <div>
              <p className="text-xs text-sa-muted mb-0.5">Location</p>
              <p className="font-medium text-sa-text">{restaurant.address}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1 border-t border-sa-border/50">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
            onClick={() => setApproveOpen(true)}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<XCircle className="h-4 w-4" />}
            onClick={() => setRejectOpen(true)}
          >
            Reject
          </Button>
        </div>
      </div>

      {approveOpen && (
        <ApproveModal
          restaurant={restaurant}
          tiers={tiers}
          onClose={() => setApproveOpen(false)}
        />
      )}
      {rejectOpen && (
        <RejectModal
          restaurant={restaurant}
          onClose={() => setRejectOpen(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function ApprovalsPageClient({
  pending,
  tiers,
}: {
  pending: PendingRestaurant[];
  tiers: Tier[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      {/* Heading */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-sa-text">
            Pending Approvals
          </h1>
          <p className="mt-1 text-sm text-sa-muted">
            Review and approve restaurant signup requests
          </p>
        </div>
        {pending.length > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sa-accent px-2 text-xs font-bold text-white">
            {pending.length}
          </span>
        )}
      </div>

      {/* Empty state */}
      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-sa-border py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sa-accent/10">
            <Building2 className="h-7 w-7 text-sa-accent/60" />
          </div>
          <div>
            <p className="font-display text-base font-semibold text-sa-text">
              No pending applications
            </p>
            <p className="mt-1 text-sm text-sa-muted">
              New restaurant signups will appear here for review.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((r) => (
            <ApprovalCard key={r.id} restaurant={r} tiers={tiers} />
          ))}
        </div>
      )}
    </div>
  );
}
