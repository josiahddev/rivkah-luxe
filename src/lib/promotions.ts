import "server-only";
import { db } from "@/lib/db";

/** Promotions that are switched on and inside their start/end dates. */
export async function activePromotions() {
  const now = new Date();
  return db.promotion.findMany({
    where: {
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { createdAt: "desc" },
    include: { collection: { select: { slug: true } } },
  });
}
