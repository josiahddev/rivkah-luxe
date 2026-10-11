import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts && tsx scripts/refresh-demo-images.ts",
  },
  datasource: {
    // Migrations use the direct (unpooled) connection when the host provides one (e.g. Neon on Vercel).
    url: process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"],
  },
});
