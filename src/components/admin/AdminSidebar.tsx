"use client";

import { useState } from "react";
import { TopLoadingBar } from "@/components/ui/TopLoadingBar";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  LayoutGrid,
  UtensilsCrossed,
  ShoppingBag,
  Bot,
  QrCode,
  Tag,
  TrendingUp,
  Plug,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Nav item definition
// ---------------------------------------------------------------------------

type NavKey = "dashboard" | "tables" | "menu" | "orders" | "waiters" | "qrCodes" | "promotions" | "analytics" | "pos" | "team" | "settings";

interface NavItem {
  key: NavKey;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  hasBadge?: boolean;
  ownerOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard",  href: "/admin",             icon: LayoutDashboard, exact: true },
  { key: "tables",     href: "/admin/tables",      icon: LayoutGrid },
  { key: "menu",       href: "/admin/menu",        icon: UtensilsCrossed },
  { key: "orders",     href: "/admin/orders",      icon: ShoppingBag, hasBadge: true },
  { key: "waiters",    href: "/admin/waiters",     icon: Bot },
  { key: "qrCodes",    href: "/admin/qr-codes",    icon: QrCode },
  { key: "promotions", href: "/admin/promotions",  icon: Tag },
  { key: "analytics",  href: "/admin/analytics",   icon: TrendingUp },
  { key: "pos",        href: "/admin/pos",         icon: Plug },
  { key: "team",       href: "/admin/team",        icon: Users, ownerOnly: true },
  { key: "settings",   href: "/admin/settings",    icon: Settings },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AdminSidebarProps {
  restaurantName: string;
  restaurantLogoUrl: string | null;
  pendingOrdersCount: number;
  userRole: string;
  userName: string;
  userEmail: string;
}

// ---------------------------------------------------------------------------
// Single nav link — used in both desktop and mobile drawers
// ---------------------------------------------------------------------------

function NavLink({
  item,
  label,
  active,
  badge,
  collapsed,
  onClick,
}: {
  item: NavItem;
  label: string;
  active: boolean;
  badge?: number;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? "bg-ra-accent/15 text-ra-accent"
          : "text-ra-muted hover:bg-white/5 hover:text-ra-text"
      } ${collapsed ? "justify-center" : ""}`}
    >
      {/* Active indicator bar */}
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-ra-accent" />
      )}

      <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-ra-accent" : "text-ra-muted group-hover:text-ra-text"}`} />

      {/* Label — hidden when icon-only */}
      {!collapsed && (
        <span className="flex-1 truncate">{label}</span>
      )}

      {/* Badge */}
      {item.hasBadge && badge && badge > 0 && (
        <span
          className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-ra-accent px-1 text-xs font-bold text-ra-bg ${
            collapsed ? "absolute right-1.5 top-1.5 h-4 min-w-4" : ""
          }`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Restaurant logo/name with dropdown (Fix 1)
// ---------------------------------------------------------------------------

function RestaurantDropdown({
  restaurantName,
  restaurantLogoUrl,
  collapsed,
  onClose,
}: {
  restaurantName: string;
  restaurantLogoUrl: string | null;
  collapsed: boolean;
  onClose?: () => void;
}) {
  const tLayout = useTranslations("admin.layout");
  const tNav    = useTranslations("admin.nav");

  return (
    <DropdownMenu.Root>
      <div className={`border-b border-ra-border ${collapsed ? "flex justify-center px-3 py-4" : "px-5 pt-5 pb-4"}`}>
        {collapsed ? (
          /* Icon-only (tablet) — single centered logo */
          <DropdownMenu.Trigger asChild>
            <button title={restaurantName} className="rounded-xl hover:opacity-80 transition-opacity focus:outline-none">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-ra-accent text-base font-bold text-ra-bg overflow-hidden">
                {restaurantLogoUrl
                  ? <Image src={restaurantLogoUrl} alt={restaurantName} fill className="object-contain p-1" />
                  : restaurantName.charAt(0)}
              </div>
            </button>
          </DropdownMenu.Trigger>
        ) : (
          /* Full sidebar — logo stacked above name */
          <div className="flex items-start justify-between">
            <DropdownMenu.Trigger asChild>
              <button title="Restaurant options" className="flex flex-col items-start gap-2.5 rounded-lg hover:opacity-80 transition-opacity focus:outline-none">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-ra-accent text-xl font-bold text-ra-bg overflow-hidden">
                  {restaurantLogoUrl
                    ? <Image src={restaurantLogoUrl} alt={restaurantName} fill className="object-contain p-1" />
                    : restaurantName.charAt(0)}
                </div>
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold text-ra-text leading-tight">{restaurantName}</p>
                  <p className="text-xs text-ra-muted leading-tight">{tLayout("adminPortal")}</p>
                </div>
              </button>
            </DropdownMenu.Trigger>

            {/* Mobile close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-ra-muted hover:bg-white/5 hover:text-ra-text"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="right"
          align="start"
          sideOffset={8}
          className="z-[100] w-52 rounded-xl border border-ra-border bg-ra-surface shadow-2xl shadow-black/40 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          <div className="px-3 py-2.5 border-b border-ra-border">
            <p className="text-xs font-semibold text-ra-text truncate">{restaurantName}</p>
            <p className="text-xs text-ra-muted">{tLayout("restaurantAdmin")}</p>
          </div>

          <div className="p-1.5 space-y-0.5">
            <DropdownMenu.Item asChild>
              <Link
                href="/admin/settings"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ra-muted hover:bg-slate-100 hover:text-ra-text transition-colors outline-none cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                {tNav("settings")}
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                href="/admin/analytics"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ra-muted hover:bg-slate-100 hover:text-ra-text transition-colors outline-none cursor-pointer"
              >
                <BarChart2 className="h-4 w-4" />
                {tNav("analytics")}
              </Link>
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ---------------------------------------------------------------------------
// User profile footer with dropdown + visible sign-out (Fix 2)
// ---------------------------------------------------------------------------

function UserFooter({
  userName,
  userEmail,
  userRole,
  collapsed,
  onSignOut,
}: {
  userName: string;
  userEmail: string;
  userRole: string;
  collapsed: boolean;
  onSignOut: () => void;
}) {
  const tLayout = useTranslations("admin.layout");
  const roleLabel = userRole.replace("restaurant_", "");

  if (collapsed) {
    return (
      <div className="border-t border-ra-border p-3 flex justify-center">
        <button
          onClick={onSignOut}
          title="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-ra-border p-3">
      <button
        onClick={onSignOut}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        {tLayout("signOut")}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar inner content (shared between desktop + mobile drawers)
// ---------------------------------------------------------------------------

function SidebarContent({
  restaurantName,
  restaurantLogoUrl,
  pendingOrdersCount,
  userRole,
  userName,
  userEmail,
  collapsed,
  onClose,
  onSignOut,
}: {
  restaurantName: string;
  restaurantLogoUrl: string | null;
  pendingOrdersCount: number;
  userRole: string;
  userName: string;
  userEmail: string;
  collapsed: boolean;
  onClose?: () => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.ownerOnly || userRole === "restaurant_owner"
  );

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background: "#1E3A5F",
        // Override ra-* tokens so Tailwind classes render correctly on the dark navy sidebar
        ["--color-ra-text" as string]:   "#FFFFFF",
        ["--color-ra-muted" as string]:  "rgba(255,255,255,0.78)",
        ["--color-ra-border" as string]: "rgba(255,255,255,0.15)",
        ["--color-ra-bg" as string]:     "rgba(255,255,255,0.08)",
        ["--color-ra-surface" as string]:"rgba(255,255,255,0.12)",
      }}
    >
      {/* Logo / Restaurant Name with dropdown */}
      <RestaurantDropdown
        restaurantName={restaurantName}
        restaurantLogoUrl={restaurantLogoUrl}
        collapsed={collapsed}
        onClose={onClose}
      />

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            label={t(item.key)}
            active={isActive(item)}
            badge={pendingOrdersCount}
            collapsed={collapsed}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* Footer — user info + sign out */}
      <UserFooter
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        collapsed={collapsed}
        onSignOut={onSignOut}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function AdminSidebar({
  restaurantName,
  restaurantLogoUrl,
  pendingOrdersCount,
  userRole,
  userName,
  userEmail,
}: AdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <>
      <TopLoadingBar visible={signingOut} />
      {/* ── Mobile hamburger trigger ───────────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3.5 z-50 flex h-8 w-8 items-center justify-center rounded-lg md:hidden"
        style={{ background: "#1E3A5F", color: "#FFFFFF" }}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Mobile drawer overlay ──────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[240px] transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "#1E3A5F" }}
      >
        <SidebarContent
          restaurantName={restaurantName}
          restaurantLogoUrl={restaurantLogoUrl}
          pendingOrdersCount={pendingOrdersCount}
          userRole={userRole}
          userName={userName}
          userEmail={userEmail}
          collapsed={false}
          onClose={() => setMobileOpen(false)}
          onSignOut={handleSignOut}
        />
      </div>

      {/* ── Tablet sidebar (icon-only, 60px) ──────────────────────────── */}
      <div
        className="fixed inset-y-0 left-0 z-30 hidden w-[60px] flex-col md:flex lg:hidden"
        style={{ background: "#1E3A5F", borderRight: "1px solid rgba(255,255,255,0.08)" }}
      >
        <SidebarContent
          restaurantName={restaurantName}
          restaurantLogoUrl={restaurantLogoUrl}
          pendingOrdersCount={pendingOrdersCount}
          userRole={userRole}
          userName={userName}
          userEmail={userEmail}
          collapsed={true}
          onSignOut={handleSignOut}
        />
      </div>

      {/* ── Desktop sidebar (full, 240px) ──────────────────────────────── */}
      <div
        className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col lg:flex"
        style={{ background: "#1E3A5F", borderRight: "1px solid rgba(255,255,255,0.08)" }}
      >
        <SidebarContent
          restaurantName={restaurantName}
          restaurantLogoUrl={restaurantLogoUrl}
          pendingOrdersCount={pendingOrdersCount}
          userRole={userRole}
          userName={userName}
          userEmail={userEmail}
          collapsed={false}
          onSignOut={handleSignOut}
        />
      </div>
    </>
  );
}
