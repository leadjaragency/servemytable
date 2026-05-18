import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RestaurantDetailView } from "@/components/super-admin/RestaurantDetailView";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ restaurantId: string }> };

async function getData(restaurantId: string) {
  const [restaurant, ratingAgg, tiers] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        tier: true,
        users: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true, name: true, email: true,
            role: true, isActive: true, createdAt: true,
          },
        },
        _count: {
          select: { dishes: true, tables: true, orders: true, reviews: true },
        },
      },
    }),
    prisma.review.aggregate({
      where: { restaurantId },
      _avg: { rating: true },
    }),
    prisma.subscriptionTier.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: "asc" },
      select: {
        id: true, name: true, monthlyPrice: true,
        maxTables: true, maxWaiters: true,
      },
    }),
  ]);

  return { restaurant, avgRating: ratingAgg._avg.rating, tiers };
}

export default async function RestaurantDetailPage({ params }: Params) {
  const { restaurantId } = await params;
  const { restaurant, avgRating, tiers } = await getData(restaurantId);

  if (!restaurant) notFound();

  // Serialise dates for client props
  const serialised = {
    ...restaurant,
    createdAt:      restaurant.createdAt.toISOString(),
    trialStartsAt:  restaurant.trialStartsAt?.toISOString() ?? null,
    trialEndsAt:    restaurant.trialEndsAt?.toISOString()   ?? null,
    avgRating,
    users: restaurant.users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  };

  return <RestaurantDetailView restaurant={serialised} tiers={tiers} />;
}
