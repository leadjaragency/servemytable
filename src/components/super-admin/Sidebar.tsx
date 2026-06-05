"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { TopLoadingBar } from "@/components/ui/TopLoadingBar";
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  CreditCard,
  Activity,
  TrendingUp,
  Settings,
  Menu,
  X,
  LogOut,
  Radio,
  ScrollText,
  ToggleLeft,
  QrCode,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface NavDef {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  hasBadge?: true;
}

interface NavGroup {
  section: string;
  items: NavDef[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    section: "Platform",
    items: [
      { label: "Overview",       href: "/super-admin",                icon: LayoutDashboard, exact: true },
      { label: "Broadcasts",     href: "/super-admin/broadcasts",     icon: Radio },
      { label: "Audit Log",      href: "/super-admin/audit-log",      icon: ScrollText },
    ],
  },
  {
    section: "Restaurants",
    items: [
      { label: "All Restaurants", href: "/super-admin/restaurants",   icon: Building2 },
      { label: "Approvals",       href: "/super-admin/approvals",     icon: ClipboardCheck, hasBadge: true },
      { label: "Feature Flags",   href: "/super-admin/feature-flags", icon: ToggleLeft },
      { label: "Demo Access",     href: "/super-admin/demo",          icon: QrCode },
    ],
  },
  {
    section: "Financials",
    items: [
      { label: "Billing",   href: "/super-admin/billing",   icon: CreditCard },
      { label: "API Usage", href: "/super-admin/api-usage", icon: Activity },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Analytics", href: "/super-admin/analytics", icon: TrendingUp },
      { label: "Settings",  href: "/super-admin/settings",  icon: Settings },
    ],
  },
];

interface SuperAdminSidebarProps {
  pendingCount: number;
  adminName: string;
}

export function SuperAdminSidebar({ pendingCount, adminName }: SuperAdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const close = () => setMobileOpen(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  const initials = adminName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const content = (
    <div className="flex h-full flex-col" style={{ background: "#0E0E0E" }}>

      {/* Logo area */}
      <div
        className="flex h-[70px] items-center shrink-0 px-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <Image
            src="/photos/logo-trimmed.png"
            alt="ServeMyTable"
            width={180}
            height={47}
            className="h-9 w-auto object-contain object-left"
            priority
            sizes="180px"
          />
          <span
            className="text-[9px] font-semibold uppercase tracking-[0.2em] pl-0.5"
            style={{ color: "#10B981" }}
          >
            Super Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.section} className={gi > 0 ? "mt-5" : ""}>
            <p
              className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "rgba(255,255,255,0.30)" }}
            >
              {group.section}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const badge = item.hasBadge && pendingCount > 0 ? pendingCount : null;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    )}
                    style={
                      isActive
                        ? { background: "#FF4D00", color: "#FFFFFF" }
                        : { color: "rgba(255,255,255,0.65)" }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                        (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)";
                      }
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge != null && (
                      <span
                        className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums text-white"
                        style={{
                          background: isActive ? "rgba(255,255,255,0.25)" : "#10B981",
                        }}
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="shrink-0 px-3 py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: "#FF4D00" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{adminName}</p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              Super Admin
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.5)" }}
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <TopLoadingBar visible={signingOut} />
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-[15px] left-4 z-50 flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
        style={{ background: "#0E0E0E", border: "none", color: "#FFFFFF" }}
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[260px] flex-col"
        style={{ background: "#0E0E0E" }}
      >
        {content}
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={close}
          aria-hidden
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "#0E0E0E" }}
      >
        {content}
      </aside>
    </>
  );
}
