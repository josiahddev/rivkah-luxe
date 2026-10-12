import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Create a Prisma client from DATABASE_URL. A `?schema=name` parameter (as used
 * by the Prisma CLI) is honoured so the app and migrations always agree.
 * Shared by the app, the seed script and the maintenance scripts.
 */
export function createClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");
  const url = new URL(raw);
  const schema = url.searchParams.get("schema") ?? undefined;
  url.searchParams.delete("schema");
  // Serverless instances each get their own pool, and hosted Postgres plans cap
  // total connections, so keep pools small and release idle connections quickly.
  const max = Number(process.env.DATABASE_POOL_MAX) || (process.env.VERCEL ? 2 : 10);
  const adapter = new PrismaPg({ connectionString: url.toString(), max, idleTimeoutMillis: 5000 }, schema ? { schema } : undefined);
  return new PrismaClient({ adapter });
}
