import { getRequiredSession, getPrismaForSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { generateTableQR, generateQR } from "@/lib/qr-generator";
import { generateKitchenToken } from "@/lib/kitchen";
import { QrCodesPageClient, type QrTable } from "@/components/admin/QrCodesPageClient";

export const dynamic = "force-dynamic";

export default async function QrCodesPage() {
  const session = await getRequiredSession();

  if (!session?.user.restaurantId) {
    redirect("/auth/login");
  }

  const restaurantId   = session.user.restaurantId;
  const restaurantSlug = session.user.restaurantSlug ?? "";
  const db = getPrismaForSession(session);

  const [restaurant, rawTables] = await Promise.all([
    db.restaurant.findUnique({
      where:  { id: restaurantId },
      select: { name: true, slug: true, kitchenToken: true },
    }),
    db.table.findMany({
      where:   { restaurantId },
      orderBy: { number: "asc" },
      select: {
        id:     true,
        number: true,
        seats:  true,
        status: true,
        qrCode: true,
        waiter: { select: { name: true, avatar: true } },
      },
    }),
  ]);

  if (!restaurant) redirect("/auth/login");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Ensure a kitchen-display token exists (generate + persist once)
  let kitchenToken = restaurant.kitchenToken;
  if (!kitchenToken) {
    kitchenToken = generateKitchenToken();
    await db.restaurant.update({
      where: { id: restaurantId },
      data:  { kitchenToken },
    });
  }
  const kitchenUrl = `${baseUrl}/kitchen/${kitchenToken}`;
  const kitchenQr  = await generateQR(kitchenUrl);

  // Pre-generate QR codes server-side for tables that don't have one saved yet
  const tables: QrTable[] = await Promise.all(
    rawTables.map(async (t) => {
      const qrCode = t.qrCode ?? (await generateTableQR(baseUrl, t.number, restaurantSlug));
      return { ...t, qrCode };
    })
  );

  return (
    <div className="p-6 lg:p-8">
      <QrCodesPageClient
        tables={tables}
        restaurantName={restaurant.name}
        restaurantSlug={restaurantSlug}
        baseUrl={baseUrl}
        kitchenUrl={kitchenUrl}
        kitchenQr={kitchenQr}
      />
    </div>
  );
}
