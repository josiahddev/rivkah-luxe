// Dev helper: print what happened for the most recent order.  npx tsx scripts/check-order.ts
import "dotenv/config";
import { createClient } from "../src/lib/db-client";

const db = createClient();

async function main() {
  const o = await db.order.findFirst({ orderBy: { createdAt: "desc" }, include: { items: true, history: true, payments: true, couponUsage: true } });
  if (!o) return console.log("no orders");
  console.log({ order: o.orderNumber, status: o.status, payment: o.paymentStatus, total: o.total, currency: o.currency, baseTotal: o.baseTotal, stockDeducted: o.stockDeducted, coupon: o.couponUsage?.couponId ? "recorded" : "none" });
  console.log("payments:", o.payments.map((p) => `${p.reference} ${p.status}`));
  console.log("history:", o.history.map((h) => h.status));
  for (const i of o.items) {
    const v = i.variantId ? await db.productVariant.findUnique({ where: { id: i.variantId } }) : null;
    const moves = await db.inventoryMovement.findMany({ where: { orderId: o.id } });
    console.log(`item ${i.sku}: stock now ${v?.stock}, movements ${moves.map((m) => m.change)}`);
  }
  console.log("emails:", (await db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 3 })).map((e) => `${e.template} → ${e.status}`));
  console.log("notifications:", (await db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 3 })).map((n) => n.title));
}

main().finally(() => db.$disconnect());
