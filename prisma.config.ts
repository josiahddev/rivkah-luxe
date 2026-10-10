import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts && tsx scripts/refresh-demo-images.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
