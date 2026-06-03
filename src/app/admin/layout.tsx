import { getRequiredSession, getPrismaForSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { LanguageSelector } from "@/components/admin/LanguageSelector";
import { Wifi, WifiOff } from "lucide-react";
import { Toaster } from "sonner";
import { isValidLocale } from "@/lib/admin-locale";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../messages/en.json";
import deMessages from "../../../messages/de.json";
import frMessages from "../../../messages/fr.json";
import esMessages from "../../../messages/es.json";

// Message map used for both server-side t() and the nested NextIntlClientProvider.
const adminMessageMap: Record<string, object> = {
  en: enMessages,
  de: deMessages,
  fr: frMessages,
  es: esMessages,
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── Auth guard ─────────────────────────────────────────────────────────
  const session = await getRequiredSession();

  if (!session) redirect("/auth/login");

  const { role, restaurantId, name: userName, email: userEmail } = session.user;

  if (role !== "restaurant_owner" && role !== "restaurant_manager") {
    redirect("/auth/login");
  }

  if (!restaurantId) redirect("/auth/login");

  // Use the schema-aware client (public for CA, de for DE)
  const db = getPrismaForSession(session);

  // ── Restaurant status guard ────────────────────────────────────────────
  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      name: true,
      status: true,
      defaultLanguage: true,
      logoUrl: true,
      isPublicDemo: true,
      _count: {
        select: {
          orders: { where: { status: { in: ["received", "preparing"] } } },
        },
      },
    },
  });

  if (!restaurant) redirect("/auth/login");

  if (restaurant.status === "pending") redirect("/auth/pending");
  if (restaurant.status === "suspended" || restaurant.status === "disabled") {
    redirect("/auth/login");
  }

  const pendingOrdersCount = restaurant._count.orders;

  // ── Per-restaurant locale ──────────────────────────────────────────────
  const restaurantLocale = isValidLocale(restaurant.defaultLanguage)
    ? restaurant.defaultLanguage
    : "en";
  const adminMessages = adminMessageMap[restaurantLocale] ?? adminMessageMap.en;

  // Read layout strings directly from the loaded messages object — avoids
  // getTranslations() which re-invokes getRequestConfig and can fail on Vercel.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layoutStrings = (adminMessages as any)?.admin?.layout ?? {};
  const t = (key: string): string => (layoutStrings[key] as string) ?? key;

  // ── Recent pending orders for notification bell ────────────────────────
  const recentOrdersRaw = await db.order.findMany({
    where: { restaurantId, status: { in: ["received", "preparing"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      createdAt: true,
      table: { select: { number: true } },
      _count: { select: { items: true } },
    },
  });
  // Serialize dates before passing to client components
  const recentOrders = JSON.parse(JSON.stringify(recentOrdersRaw)) as Array<{
    id: string; orderNumber: string; status: string; createdAt: string;
    table: { number: number }; _count: { items: number };
  }>;

  // ── POS status (mock — always connected for demo) ──────────────────────
  const posConnected = true;

  return (
    <NextIntlClientProvider locale={restaurantLocale} messages={adminMessages}>
    <div className="zone-admin min-h-screen bg-ra-bg text-ra-text">
      {/* Sidebar */}
      <AdminSidebar
        restaurantName={restaurant.name}
        restaurantLogoUrl={restaurant.logoUrl ?? null}
        pendingOrdersCount={pendingOrdersCount}
        userRole={role}
        userName={userName ?? "User"}
        userEmail={userEmail ?? ""}
        isPublicDemo={restaurant.isPublicDemo}
      />

      {/* Main content — offset for sidebar at each breakpoint */}
      <div className="flex min-h-screen flex-col pl-0 md:pl-[60px] lg:pl-[240px]">
        {/* ── Topbar ──────────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-20 flex h-[58px] items-center justify-between px-6 pl-14 md:pl-6"
          style={{ background: "#FFFFFF", borderBottom: "1px solid #CBD5E1" }}
        >
          {/* Restaurant name (hidden on mobile — hamburger is there instead) */}
          <div className="hidden md:block">
            <p className="text-sm font-semibold leading-tight" style={{ color: "#0F172A" }}>
              {restaurant.name}
            </p>
            <p className="text-xs font-medium leading-tight" style={{ color: "#334155" }}>{t("restaurantAdmin")}</p>
          </div>
          <div className="md:hidden" />

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Language selector (owner only) */}
            {role === "restaurant_owner" && (
              <LanguageSelector currentLocale={restaurantLocale} restaurantId={restaurantId} />
            )}

            {/* POS connection pill */}
            <div
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                posConnected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {posConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">
                {posConnected ? t("posConnected") : t("posOffline")}
              </span>
            </div>

            {/* Notification bell */}
            <NotificationBell
              count={pendingOrdersCount}
              recentOrders={recentOrders}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <Toaster position="top-right" theme="dark" richColors />
    </div>
    </NextIntlClientProvider>
  );
}
