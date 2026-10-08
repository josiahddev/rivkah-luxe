import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/auth/session";

/**
 * Fixed-window rate limiter backed by Postgres, so it works across serverless
 * instances. Returns true when the request is allowed.
 */
export async function rateLimit(name: string, limit: number, windowSeconds: number, identity?: string) {
  const h = await headers();
  const key = `${name}:${identity ?? clientIp(h)}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  try {
    const row = await db.rateLimit.findUnique({ where: { key } });
    if (!row || row.windowStart < windowStart) {
      await db.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, windowStart: now },
        update: { count: 1, windowStart: now },
      });
      return true;
    }
    if (row.count >= limit) return false;
    await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    return true;
  } catch (err) {
    console.error("[rate-limit]", err);
    return true; // never block customers because the limiter itself failed
  }
}
