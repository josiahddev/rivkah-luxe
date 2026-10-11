// Runs the (re-run safe) seed during a Vercel build when SEED_ON_DEPLOY=true,
// so a fresh demo deployment gets its products and owner account without any
// local steps. Turn the variable off before launching the real store.
import { execSync } from "node:child_process";

if (process.env.SEED_ON_DEPLOY === "true") {
  console.log("SEED_ON_DEPLOY=true: seeding the database");
  execSync("npx prisma db seed", { stdio: "inherit" });
} else {
  console.log("Skipping seed (SEED_ON_DEPLOY is not true)");
}
