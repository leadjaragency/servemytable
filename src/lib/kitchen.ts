import { randomUUID } from "crypto";
import { prisma, prismaDE } from "@/lib/db";
import type { PrismaClient } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Kitchen display — no-login "capability URL" access for the head chef.
// A per-restaurant unguessable token (kitchenToken) grants read + status-advance
// access to that restaurant's live orders only. Treat the token like a password.
// ---------------------------------------------------------------------------

/** Generates an unguessable kitchen token (two UUIDs, hyphen-stripped). */
export function generateKitchenToken(): string {
  return (randomUUID() + randomUUID()).replace(/-/g, "");
}

export interface ResolvedKitchen {
  db: PrismaClient;
  restaurant: { id: string; name: string; slug: string; status: string };
}

/**
 * Resolves an active restaurant by its kitchen token, searching both the
 * Canadian (public) and German (de) schemas — mirrors getRestaurantFromSlug.
 * Returns null if the token is missing/unknown or the restaurant is inactive.
 */
export async function resolveKitchenRestaurant(
  token: string | undefined | null
): Promise<ResolvedKitchen | null> {
  if (!token) return null;

  const select = { id: true, name: true, slug: true, status: true } as const;

  let restaurant = await prisma.restaurant.findUnique({
    where: { kitchenToken: token },
    select,
  });
  let db: PrismaClient = prisma;

  if (!restaurant) {
    restaurant = await prismaDE.restaurant.findUnique({
      where: { kitchenToken: token },
      select,
    });
    db = prismaDE;
  }

  if (!restaurant || restaurant.status !== "active") return null;
  return { db, restaurant };
}

/** Order include shape shared by the kitchen page + API (mirrors /api/orders). */
export const KITCHEN_ORDER_INCLUDE = {
  table: { select: { id: true, number: true, seats: true } },
  items: {
    include: {
      dish: {
        select: {
          id: true,
          name: true,
          allergens: true,
          imageEmoji: true,
          isVeg: true,
          isVegan: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

/** Statuses shown on the kitchen board (excludes already-served). */
export const KITCHEN_ACTIVE_STATUSES = ["received", "preparing", "ready"] as const;
