import { getRequiredSession } from "@/lib/auth";
import { redirect } from "next/navigation";

import { Bell } from "lucide-react";
import { Toaster } from "sonner";

import { prisma } from "@/lib/db";
import { SuperAdminSidebar } from "@/components/super-admin/Sidebar";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getRequiredSession();
  if (!session || session.user.role !== "super_admin") {
    redirect("/auth/login");
  }

  const pendingCount = await prisma.restaurant.count({
    where: { status: "pending" },
  });

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const initials = session.user.name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="zone-super-admin min-h-screen" style={{ background: "#0A0A0A" }}>
      <SuperAdminSidebar
        pendingCount={pendingCount}
        adminName={session.user.name}
      />

      <div className="lg:pl-[260px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header
          className="sticky top-0 z-20 flex h-[58px] items-center justify-between gap-4 px-6"
          style={{
            background: "#1A1A1A",
            borderBottom: "1px solid #2A2A2A",
          }}
        >
          {/* Left */}
          <div className="flex items-center gap-4">
            <div className="lg:hidden w-8 shrink-0" aria-hidden />
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#AD897E" }}
            >
              Super Admin
            </span>
          </div>

          {/* Right: date, bell, avatar */}
          <div className="flex items-center gap-3">
            <p className="hidden sm:block text-xs font-medium" style={{ color: "#94A3B8" }}>
              {dateStr}
            </p>

            {/* Notification bell */}
            <a
              href="/super-admin/approvals"
              className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
              style={{ color: "#AD897E" }}
              aria-label={
                pendingCount > 0
                  ? `${pendingCount} pending approval${pendingCount > 1 ? "s" : ""}`
                  : "Notifications"
              }
            >
              <Bell className="h-4 w-4" />
              {pendingCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ background: "#10B981" }}
                  />
                  <span
                    className="relative inline-flex h-2 w-2 rounded-full"
                    style={{ background: "#10B981" }}
                  />
                </span>
              )}
            </a>

            {/* Avatar */}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold select-none text-white"
              style={{ background: "#FF4D00" }}
              title={session.user.name}
            >
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
