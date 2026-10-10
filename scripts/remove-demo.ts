// Delete all demo/test data before launch: demo products, orders, customers,
// reviews, coupons, promotions, subscribers, messages, carts and notifications.
// Store settings, categories, collections, pages, FAQ, shipping zones and your
// own (non-demo) products, orders and accounts are kept.
//   npm run db:remove-demo            (asks for confirmation)
//   npm run db:remove-demo -- --yes   (no prompt)
import "dotenv/config";
import readline from "node:readline";
import { createClient } from "../src/lib/db-client";

const db = createClient();

async function confirm() {
  if (process.argv.includes("--yes")) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((r) => rl.question('This permanently deletes all DEMO data. Type "delete demo" to continue: ', r));
  rl.close();
  return answer.trim().toLowerCase() === "delete demo";
}

async function main() {
  const counts = {
    products: await db.product.count({ where: { isDemo: true } }),
    orders: await db.order.count({ where: { isDemo: true } }),
    customers: await db.user.count({ where: { isDemo: true } }),
    reviews: await db.review.count({ where: { isDemo: true } }),
  };
  console.log("Demo data found:", counts);
  if (!(await confirm())) return console.log("Cancelled — nothing was deleted.");

  const demoUsers = (await db.user.findMany({ where: { isDemo: true }, select: { id: true, email: true } }));
  const demoEmails = demoUsers.map((u) => u.email);
  const r = await db.$transaction([
    db.order.deleteMany({ where: { OR: [{ isDemo: true }, { email: { endsWith: "@example.com" } }] } }),
    db.review.deleteMany({ where: { OR: [{ isDemo: true }, { email: { endsWith: "@example.com" } }] } }),
    db.cart.deleteMany({ where: { OR: [{ email: { endsWith: "@example.com" } }, { userId: { in: demoUsers.map((u) => u.id) } }, { token: { startsWith: "demo-" } }] } }),
    db.product.deleteMany({ where: { isDemo: true } }),
    db.user.deleteMany({ where: { isDemo: true } }),
    db.coupon.deleteMany({ where: { isDemo: true } }),
    db.promotion.deleteMany({ where: { isDemo: true } }),
    db.newsletterSubscriber.deleteMany({ where: { OR: [{ isDemo: true }, { email: { in: demoEmails } }] } }),
    db.contactMessage.deleteMany({ where: { isDemo: true } }),
    db.notification.deleteMany({}),
    db.mediaAsset.deleteMany({ where: { url: { startsWith: "/demo/" } } }),
  ]);
  console.log(`✓ Removed ${r[3].count} products, ${r[0].count} orders, ${r[4].count} customers, ${r[1].count} reviews, ${r[5].count} coupons and ${r[6].count} promotions.`);
  console.log("  Categories, collections, pages, FAQ, shipping zones and settings were kept.");
  console.log("  Tip: replace the homepage photos under Website content → Homepage.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
