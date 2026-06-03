export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  resolveKitchenRestaurant,
  KITCHEN_ORDER_INCLUDE,
  KITCHEN_ACTIVE_STATUSES,
} from "@/lib/kitchen";
import { KitchenBoard } from "@/components/kitchen/KitchenBoard";

type Params = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: "Kitchen Display",
  robots: { index: false, follow: false },
};

export default async function KitchenPage({ params }: Params) {
  const { token } = await params;
  const resolved = await resolveKitchenRestaurant(token);
  if (!resolved) notFound();

  const { db, restaurant } = resolved;

  const orders = await db.order.findMany({
    where: {
      restaurantId: restaurant.id,
      status: { in: [...KITCHEN_ACTIVE_STATUSES] },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: KITCHEN_ORDER_INCLUDE,
  });

  return (
    <KitchenBoard
      token={token}
      restaurantName={restaurant.name}
      initialOrders={JSON.parse(JSON.stringify(orders))}
    />
  );
}
