"use client";

import { CheckCircle2, ShoppingBag, Edit3 } from "lucide-react";
import type { CartItem } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BubbleMessage {
  id:          string;
  role:        "user" | "assistant";
  content:     string;
  quickReplies: string[];
  isStreaming:  boolean;
  timestamp:   Date;
}

interface ChatBubbleProps {
  message:    BubbleMessage;
  waiterName: string;
  waiterAvatar: string;
  /** Zustand cart items — used to render the order summary card */
  cartItems:  CartItem[];
  onConfirmOrder: () => void;
  onModifyOrder:  () => void;
  /** Whether this message should show the order summary card */
  showOrderCard: boolean;
}

// ---------------------------------------------------------------------------
// Order summary card
// ---------------------------------------------------------------------------

function OrderSummaryCard({
  cartItems,
  onConfirm,
  onModify,
}: {
  cartItems:  CartItem[];
  onConfirm:  () => void;
  onModify:   () => void;
}) {
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-cu-accent/30 bg-cu-surface shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 bg-cu-accent/8 px-4 py-2.5">
        <ShoppingBag className="h-4 w-4 text-cu-accent" />
        <span className="text-sm font-semibold text-cu-text">Order Summary</span>
      </div>

      {/* Items */}
      <ul className="divide-y divide-cu-border/50 px-4">
        {cartItems.map((item) => (
          <li key={item.dishId} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              {item.imageEmoji && (
                <span className="text-base leading-none shrink-0">{item.imageEmoji}</span>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-cu-text truncate">{item.name}</p>
                {item.specialInst && (
                  <p className="text-xs text-cu-text/50 truncate">{item.specialInst}</p>
                )}
                {item.allergens.length > 0 && (
                  <p className="text-xs text-amber-600">⚠️ {item.allergens.join(", ")}</p>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right ml-3">
              <span className="text-sm text-cu-text/60 mr-2">×{item.quantity}</span>
              <span className="text-sm font-semibold text-cu-text">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Total */}
      <div className="flex justify-between border-t border-cu-border/50 px-4 py-2.5">
        <span className="text-sm font-medium text-cu-text/70">Subtotal</span>
        <span className="text-sm font-bold text-cu-text">${subtotal.toFixed(2)}</span>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 p-3 pt-0">
        <button
          onClick={onModify}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-cu-border py-2.5 text-sm font-medium text-cu-text/70 hover:bg-cu-bg transition-colors"
        >
          <Edit3 className="h-4 w-4" />
          Modify
        </button>
        <button
          onClick={onConfirm}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-cu-accent py-2.5 text-sm font-semibold text-white hover:bg-cu-accent/90 transition-colors"
        >
          <CheckCircle2 className="h-4 w-4" />
          Confirm Order
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Streaming cursor
// ---------------------------------------------------------------------------

function StreamingCursor() {
  return (
    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-cu-text/50 align-middle" />
  );
}

// ---------------------------------------------------------------------------
// Main bubble
// ---------------------------------------------------------------------------

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function ChatBubble({
  message,
  waiterName,
  waiterAvatar,
  cartItems,
  onConfirmOrder,
  onModifyOrder,
  showOrderCard,
}: ChatBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1 animate-fadeIn">
        <div className="max-w-[78%]">
          <div className="rounded-2xl rounded-br-sm bg-cu-accent px-4 py-2.5 shadow-sm">
            <p className="text-sm leading-relaxed text-white whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
          <p className="mt-1 text-right text-[11px] text-cu-text/40">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  // ── AI message ───────────────────────────────────────────────────────────
  return (
    <div className="flex items-end gap-2.5 px-4 py-1 animate-fadeIn">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cu-text/8 text-base leading-none select-none">
        {waiterAvatar}
      </div>

      <div className="max-w-[80%] min-w-0">
        {/* Sender name */}
        <p className="mb-1 text-[11px] font-medium text-cu-text/50">{waiterName}</p>

        {/* Text bubble */}
        {message.content || message.isStreaming ? (
          <div className="rounded-2xl rounded-bl-sm bg-cu-surface px-4 py-2.5 shadow-sm ring-1 ring-white/8">
            <p className="text-sm leading-relaxed text-cu-text whitespace-pre-wrap break-words">
              {message.content}
              {message.isStreaming && <StreamingCursor />}
            </p>
          </div>
        ) : null}

        {/* Order summary card (when AI is confirming order) */}
        {showOrderCard && cartItems.length > 0 && !message.isStreaming && (
          <OrderSummaryCard
            cartItems={cartItems}
            onConfirm={onConfirmOrder}
            onModify={onModifyOrder}
          />
        )}

        {/* Timestamp */}
        {!message.isStreaming && (
          <p className="mt-1 text-[11px] text-cu-text/40">
            {formatTime(message.timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}
