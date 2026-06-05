"use client";

import {
  useState, useEffect, useRef, useCallback,
} from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Send, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCustomer } from "@/lib/CustomerContext";
import { useCartStore, selectItemCount } from "@/lib/store";
import { ChatBubble, type BubbleMessage } from "@/components/customer/ChatBubble";
import { QuickReply } from "@/components/customer/QuickReply";
import { TypingIndicator } from "@/components/customer/TypingIndicator";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Keywords that indicate the AI wants to confirm an order
const ORDER_CONFIRM_KEYWORDS = [
  "order summary", "here's your order", "confirm your order",
  "ready to place", "shall i place", "confirm the order",
];

function hasOrderConfirmSignal(content: string, quickReplies: string[]): boolean {
  const lower = content.toLowerCase();
  if (ORDER_CONFIRM_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  return quickReplies.some((qr) =>
    /confirm|place.+order|place my order/i.test(qr)
  );
}

// ---------------------------------------------------------------------------
// SSE stream consumer
// ---------------------------------------------------------------------------

type SSEHandler = {
  onDelta: (text: string) => void;
  onDone:  (quickReplies: string[], msgId: string) => void;
  onError: (message: string) => void;
};

async function consumeSSE(stream: ReadableStream<Uint8Array>, handlers: SSEHandler) {
  const reader  = stream.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const dataLine = event.split("\n").find((l) => l.startsWith("data: "));
        if (!dataLine) continue;

        try {
          const data = JSON.parse(dataLine.slice(6)) as {
            t:      string;
            v?:     string;
            qr?:    string[];
            msgId?: string;
            error?: string;
          };

          if (data.t === "delta" && data.v)  handlers.onDelta(data.v);
          if (data.t === "done")              handlers.onDone(data.qr ?? [], data.msgId ?? "");
          if (data.t === "error")             handlers.onError(data.error ?? "Unknown error");
        } catch {
          // Malformed JSON chunk — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Chat page
// ---------------------------------------------------------------------------

export default function ChatPage() {
  const t              = useTranslations("customer.chat");
  const params         = useParams<{ tableId: string }>();
  const searchParams   = useSearchParams();
  const router         = useRouter();
  const restaurantSlug = searchParams.get("restaurant") ?? "";

  const { restaurant, table, waiter, sessionId } = useCustomer();
  const cartItems  = useCartStore((s) => s.items);
  const cartCount  = useCartStore(selectItemCount);

  // ?orderPlaced=SP-0001 — set by cart page after a successful order submission
  const orderPlaced = searchParams.get("orderPlaced");

  const [messages,       setMessages]       = useState<BubbleMessage[]>([]);
  const [inputText,      setInputText]      = useState("");
  const [isTyping,       setIsTyping]       = useState(false);
  const [isSending,      setIsSending]      = useState(false);
  const [historyLoaded,  setHistoryLoaded]  = useState(false);
  const [greetingFired,  setGreetingFired]  = useState(false);

  const messagesEndRef         = useRef<HTMLDivElement>(null);
  const inputRef               = useRef<HTMLInputElement>(null);
  const streamingIdRef         = useRef<string | null>(null);
  const orderConfirmFiredRef   = useRef(false);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Load history ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId || historyLoaded) return;

    fetch(`/api/chat/history?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data: {
        messages?: Array<{
          id: string; role: string; content: string;
          quickReplies?: string[]; createdAt: string;
        }>;
      }) => {
        if (data.messages && data.messages.length > 0) {
          setMessages(
            data.messages.map((m) => ({
              id:           m.id,
              role:         m.role as "user" | "assistant",
              content:      m.content,
              quickReplies: m.quickReplies ?? [],
              isStreaming:  false,
              timestamp:    new Date(m.createdAt),
            }))
          );
        }
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
  }, [sessionId, historyLoaded]);

  // ── Core send function ────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string, opts?: { isInit?: boolean; skipUserBubble?: boolean }) => {
      if (!sessionId || !restaurant || !table || isSending) return;

      const isInit        = opts?.isInit        ?? false;
      const skipUserBubble = opts?.skipUserBubble ?? isInit;

      // Snapshot the current messages for the API payload
      const currentMessages = messages;

      // Add user bubble immediately (unless it's the silent greeting)
      if (!skipUserBubble) {
        setMessages((prev) => [
          ...prev,
          {
            id:           `user-${Date.now()}`,
            role:         "user",
            content,
            quickReplies: [],
            isStreaming:  false,
            timestamp:    new Date(),
          },
        ]);
      }

      setIsSending(true);
      setIsTyping(true);

      // Build messages array for the API
      const apiMessages: Array<{ role: "user" | "assistant"; content: string }> = [
        ...currentMessages.map((m) => ({ role: m.role, content: m.content })),
        ...(isInit ? [] : [{ role: "user" as const, content }]),
      ];
      if (isInit) {
        // For isInit we still need at least one message — the route uses its own greeting prompt
        apiMessages.push({ role: "user" as const, content: "__greeting__" });
      }

      // Create streaming placeholder
      const streamingId = `stream-${Date.now()}`;
      streamingIdRef.current = streamingId;

      // Show typing briefly before first chunk arrives
      setTimeout(() => {
        if (streamingIdRef.current === streamingId) {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id:           streamingId,
              role:         "assistant",
              content:      "",
              quickReplies: [],
              isStreaming:  true,
              timestamp:    new Date(),
            },
          ]);
        }
      }, 800);

      try {
        const res = await fetch("/api/chat", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            messages:       apiMessages,
            tableNumber:    table.number,
            sessionId,
            restaurantSlug: restaurant.slug,
            currentCart:    cartItems.map((i) => ({
              name:        i.name,
              quantity:    i.quantity,
              price:       i.price,
              allergens:   i.allergens,
              specialInst: i.specialInst,
            })),
            isInit,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        // Clear typing indicator in case it's still showing
        setIsTyping(false);

        // Add placeholder if not yet added (fast network)
        setMessages((prev) => {
          if (prev.some((m) => m.id === streamingId)) return prev;
          return [
            ...prev,
            {
              id:           streamingId,
              role:         "assistant",
              content:      "",
              quickReplies: [],
              isStreaming:  true,
              timestamp:    new Date(),
            },
          ];
        });

        await consumeSSE(res.body, {
          onDelta: (text) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingId
                  ? { ...m, content: m.content + text }
                  : m
              )
            );
          },
          onDone: (qr, msgId) => {
            streamingIdRef.current = null;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingId
                  ? { ...m, id: msgId || streamingId, isStreaming: false, quickReplies: qr }
                  : m
              )
            );
          },
          onError: (errMsg) => {
            streamingIdRef.current = null;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingId
                  ? {
                      ...m,
                      content:     errMsg || "Sorry, something went wrong. Please try again.",
                      isStreaming: false,
                    }
                  : m
              )
            );
          },
        });
      } catch (err) {
        console.error("[ChatPage] send error:", err);
        streamingIdRef.current = null;
        setIsTyping(false);
        // Replace placeholder with error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId
              ? {
                  ...m,
                  content:     "Sorry, I'm having trouble connecting. Please try again.",
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsSending(false);
        setIsTyping(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId, restaurant, table, messages, cartItems, isSending]
  );

  // ── Auto-greeting on first visit (suppressed when order was just placed) ──
  useEffect(() => {
    if (
      historyLoaded &&
      messages.length === 0 &&
      sessionId &&
      restaurant &&
      table &&
      !greetingFired &&
      !orderPlaced  // Don't greet — order confirmation will fire instead
    ) {
      setGreetingFired(true);
      sendMessage("", { isInit: true, skipUserBubble: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoaded, messages.length, sessionId, restaurant, table, greetingFired, orderPlaced]);

  // ── Order confirmation — fires once when redirected from cart ─────────────
  useEffect(() => {
    if (!historyLoaded || !sessionId || !restaurant || !table) return;
    if (!orderPlaced) return;
    if (orderConfirmFiredRef.current || isSending) return;

    orderConfirmFiredRef.current = true;
    setGreetingFired(true); // prevent greeting from firing too

    sendMessage(
      `My order #${orderPlaced} has just been placed. ` +
      `Please confirm it warmly, give me an estimated preparation time, ` +
      `and let me know about any games I can play while I wait.`,
      { skipUserBubble: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoaded, sessionId, restaurant, table, orderPlaced]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isSending) return;
    setInputText("");
    sendMessage(text);
  }, [inputText, isSending, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = useCallback(
    (reply: string) => {
      if (isSending) return;
      sendMessage(reply);
    },
    [isSending, sendMessage]
  );

  const handleConfirmOrder = useCallback(() => {
    sendMessage("Yes, please confirm my order and send it to the kitchen.");
  }, [sendMessage]);

  const handleModifyOrder = useCallback(() => {
    router.push(`/table/${params.tableId}/cart?restaurant=${encodeURIComponent(restaurantSlug)}`);
  }, [router, params.tableId, restaurantSlug]);

  // ── Determine which AI messages show the order card ─────────────────────
  const lastAiIndex = messages.reduce(
    (acc, m, i) => (m.role === "assistant" ? i : acc),
    -1
  );

  // ── Render ────────────────────────────────────────────────────────────────
  const waiterName   = waiter?.name   ?? "AI Waiter";
  const waiterAvatar = waiter?.avatar ?? "🤖";

  return (
    <div className="flex flex-col bg-cu-bg" style={{ minHeight: "calc(100dvh - 64px)" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-cu-border bg-[#131313]/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cu-bg text-xl leading-none">
          {waiterAvatar}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-cu-text leading-tight">{waiterName}</p>
          <p className="text-xs text-cu-text/50 leading-tight">
            {isSending ? (
              <span className="text-cu-accent">{t("typing")}</span>
            ) : (
              "AI Waiter · Online"
            )}
          </p>
        </div>

        {/* Cart shortcut */}
        {cartCount > 0 && (
          <button
            onClick={() =>
              router.push(
                `/table/${params.tableId}/cart?restaurant=${encodeURIComponent(restaurantSlug)}`
              )
            }
            className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-cu-accent/10"
          >
            <ShoppingBag className="h-4.5 w-4.5 text-cu-accent" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cu-accent text-[9px] font-bold text-white">
              {cartCount}
            </span>
          </button>
        )}
      </header>

      {/* ── Messages area ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-24 pt-4">
        {/* Date divider */}
        <div className="mb-4 flex items-center gap-3 px-6">
          <div className="h-px flex-1 bg-cu-border" />
          <p className="text-[11px] font-medium text-cu-text/40">{t("today")}</p>
          <div className="h-px flex-1 bg-cu-border" />
        </div>

        {/* Empty state while loading greeting */}
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <span className="text-4xl">{waiterAvatar}</span>
            <p className="text-sm text-cu-text/50">
              {greetingFired ? "Connecting to your waiter…" : "Starting your session…"}
            </p>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, index) => {
          const isLastAi    = index === lastAiIndex;
          const showCard    = isLastAi && !msg.isStreaming && cartItems.length > 0
                              && hasOrderConfirmSignal(msg.content, msg.quickReplies);

          return (
            <div key={msg.id}>
              <ChatBubble
                message={msg}
                waiterName={waiterName}
                waiterAvatar={waiterAvatar}
                cartItems={cartItems}
                onConfirmOrder={handleConfirmOrder}
                onModifyOrder={handleModifyOrder}
                showOrderCard={showCard}
              />

              {/* Quick replies only under the last AI message */}
              {isLastAi && msg.quickReplies.length > 0 && !msg.isStreaming && (
                <QuickReply
                  replies={msg.quickReplies}
                  onSelect={handleQuickReply}
                  disabled={isSending}
                />
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator avatar={waiterAvatar} />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar — fixed above BottomNav ──────────────────────────── */}
      <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-cu-border bg-[#131313]/95 px-4 py-2.5 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[480px] items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            disabled={isSending}
            className="flex-1 rounded-full border border-cu-border bg-cu-bg px-4 py-2.5 text-sm text-cu-text placeholder:text-cu-text/40 focus:border-cu-accent/50 focus:outline-none focus:ring-2 focus:ring-cu-accent/20 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cu-accent text-white shadow-sm transition-all hover:bg-cu-accent/90 active:scale-95 disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
