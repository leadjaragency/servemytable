"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, ShoppingBag, ExternalLink } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslations } from "next-intl";

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  table: { number: number };
  _count: { items: number };
}

interface NotificationBellProps {
  count: number;
  recentOrders: RecentOrder[];
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function NotificationBell({ count, recentOrders }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("admin.notifications");

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-xl text-ra-muted hover:bg-white/5 hover:text-ra-text transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <>
              {/* Pulsing ring */}
              <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-4 w-4 animate-ping rounded-full bg-ra-accent opacity-40" />
              {/* Count badge */}
              <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ra-accent text-[10px] font-bold text-ra-bg">
                {count > 9 ? "9+" : count}
              </span>
            </>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 rounded-xl border border-ra-border bg-ra-surface shadow-2xl shadow-black/40 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ra-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-ra-accent" />
              <span className="text-sm font-semibold text-ra-text">{t("title")}</span>
            </div>
            {count > 0 && (
              <span className="rounded-full bg-ra-accent/15 px-2 py-0.5 text-xs font-medium text-ra-accent">
                {count} pending
              </span>
            )}
          </div>

          {/* Order list */}
          <div className="max-h-72 overflow-y-auto">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-ra-muted">
                <Bell className="h-8 w-8 opacity-30" />
                <p className="text-sm">{t("noPendingOrders")}</p>
              </div>
            ) : (
              recentOrders.map((order) => (
                <DropdownMenu.Item key={order.id} asChild>
                  <Link
                    href="/admin/orders"
                    className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors outline-none cursor-pointer border-b border-ra-border/50 last:border-0"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ra-accent/15">
                      <ShoppingBag className="h-3.5 w-3.5 text-ra-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ra-text leading-tight">
                        Table {order.table.number}
                        <span className="ml-2 text-xs text-ra-muted font-normal">
                          #{order.orderNumber}
                        </span>
                      </p>
                      <p className="text-xs text-ra-muted mt-0.5">
                        {order._count.items} item{order._count.items !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                          order.status === "received"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-blue-500/15 text-blue-400"
                        }`}
                      >
                        {order.status}
                      </span>
                      <p className="mt-1 text-[10px] text-ra-muted">{timeAgo(order.createdAt)}</p>
                    </div>
                  </Link>
                </DropdownMenu.Item>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-ra-border px-4 py-2.5">
            <DropdownMenu.Item asChild>
              <Link
                href="/admin/orders"
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-ra-accent hover:underline outline-none"
              >
                {t("viewAllOrders")}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
