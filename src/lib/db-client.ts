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
  const adapter = new PrismaPg({ connectionString: url.toString() }, schema ? { schema } : undefined);
  return new PrismaClient({ adapter });
}
