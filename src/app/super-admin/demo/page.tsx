export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { QrCode } from "lucide-react";

import { getRequiredSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateQR, buildTableUrl } from "@/lib/qr-generator";
import { DemoQrPanel } from "@/components/super-admin/DemoQrPanel";

export default async function SuperAdminDemoPage() {
  const session = await getRequiredSession().catch(() => null);
  if (!session || session.user.role !== "super_admin") redirect("/auth/login");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const demo = await prisma.restaurant.findFirst({
    where: { isPublicDemo: true },
    select: {
      name: true,
      slug: true,
      tables: { orderBy: { number: "asc" }, take: 1, select: { number: true } },
    },
  });

  let panel: React.ReactNode;
  if (!demo) {
    panel = (
      <div
        className="flex flex-col items-center justify-center rounded-2xl py-20 text-center"
        style={{ background: "#FFFFFF", border: "1px dashed #CBD5E1" }}
      >
        <QrCode className="h-10 w-10 mb-4" style={{ color: "#CBD5E1" }} />
        <p className="text-sm font-medium text-sa-muted">No demo restaurant configured</p>
        <p className="mt-1 text-xs text-sa-muted">
          Flag a restaurant with <code>isPublicDemo = true</code> to enable open demo access.
        </p>
      </div>
    );
  } else {
    const tableNumber = demo.tables[0]?.number ?? 1;
    const adminUrl = `${baseUrl}/api/demo/enter`;
    const customerUrl = buildTableUrl(baseUrl, tableNumber, demo.slug);
    const [adminQr, customerQr] = await Promise.all([
      generateQR(adminUrl),
      generateQR(customerUrl),
    ]);
    panel = (
      <DemoQrPanel
        restaurantName={demo.name}
        adminUrl={adminUrl}
        customerUrl={customerUrl}
        adminQr={adminQr}
        customerQr={customerQr}
        tableNumber={tableNumber}
      />
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: "rgba(37,99,235,0.10)" }}
        >
          <QrCode className="h-5 w-5" style={{ color: "#2563EB" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-sa-text">Demo Access</h1>
          <p className="text-sm text-sa-muted">
            Hand these QR codes to prospects so they can explore the live demo — no login required
          </p>
        </div>
      </div>
      {panel}
    </div>
  );
}
