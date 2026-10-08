import "server-only";
import { db } from "@/lib/db";
import { STORE_TZ } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

// All money in reports is in the base currency (orders paid in other
// currencies are converted with the rate stored on the order).

export const SALE_WHERE: Prisma.OrderWhereInput = { paymentStatus: "PAID", status: { notIn: ["CANCELLED", "REFUNDED"] } };

const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: STORE_TZ }); // YYYY-MM-DD

/** Start of "today" in the store's timezone, as a UTC Date. */
function startOfToday() {
  const now = new Date();
  const key = dayKey(now);
  // Find the UTC instant whose local date flips to `key` (search hourly — robust to DST).
  const guess = new Date(`${key}T00:00:00Z`);
  for (let h = -14; h <= 14; h++) {
    const t = new Date(guess.getTime() + h * 3600000);
    if (dayKey(t) === key && dayKey(new Date(t.getTime() - 3600000)) !== key) return t;
  }
  return guess;
}

export function rangeStart(days: number) {
  return new Date(startOfToday().getTime() - (days - 1) * 86400000);
}

const lineBase = (lineTotal: number, fxRate: number) => (fxRate === 1 ? lineTotal : Math.round(lineTotal / fxRate));

export async function dashboardStats() {
  const today = startOfToday();
  const week = rangeStart(7);
  const month = rangeStart(30);
  const sumSince = (since: Date) => db.order.aggregate({ where: { ...SALE_WHERE, paidAt: { gte: since } }, _sum: { baseTotal: true }, _count: true });
  const [t, w, m, all, pending, customers, lowStock, sold, recent] = await Promise.all([
    sumSince(today),
    sumSince(week),
    sumSince(month),
    db.order.aggregate({ where: SALE_WHERE, _sum: { baseTotal: true }, _count: true }),
    db.order.count({ where: { status: { in: ["PAYMENT_CONFIRMED", "PROCESSING", "READY_FOR_DELIVERY"] } } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.productVariant.findMany({
      where: { isActive: true, product: { status: { in: ["PUBLISHED", "OUT_OF_STOCK"] } } },
      include: { product: { select: { name: true, id: true } } },
      orderBy: { stock: "asc" },
    }),
    db.orderItem.aggregate({ where: { order: SALE_WHERE }, _sum: { quantity: true } }),
    db.order.findMany({ where: { NOT: { status: "PENDING", paymentStatus: "PENDING" } }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  return {
    today: { revenue: t._sum.baseTotal ?? 0, orders: t._count },
    week: { revenue: w._sum.baseTotal ?? 0, orders: w._count },
    month: { revenue: m._sum.baseTotal ?? 0, orders: m._count },
    total: { revenue: all._sum.baseTotal ?? 0, orders: all._count },
    pending,
    customers,
    productsSold: sold._sum.quantity ?? 0,
    lowStock: lowStock.filter((v) => v.stock <= v.lowStockThreshold).slice(0, 8),
    recent,
  };
}

export async function salesReport(days: number) {
  const since = rangeStart(days);
  const [orders, cartsCreated, newCustomers, abandoned] = await Promise.all([
    db.order.findMany({
      where: { ...SALE_WHERE, paidAt: { gte: since } },
      select: {
        email: true, baseTotal: true, paidAt: true, fxRate: true, currency: true,
        items: { select: { productId: true, productName: true, quantity: true, lineTotal: true, product: { select: { category: { select: { name: true } } } } } },
      },
    }),
    db.cart.count({ where: { createdAt: { gte: since } } }),
    db.user.findMany({ where: { role: "CUSTOMER", createdAt: { gte: since } }, select: { createdAt: true } }),
    abandonedCarts(),
  ]);

  // Daily series (every day present, even with zero sales).
  const byDay = new Map<string, { revenue: number; orders: number; customers: number }>();
  for (let i = 0; i < days; i++) byDay.set(dayKey(new Date(since.getTime() + i * 86400000 + 3600000)), { revenue: 0, orders: 0, customers: 0 });
  for (const o of orders) {
    const k = dayKey(o.paidAt!);
    const row = byDay.get(k);
    if (row) {
      row.revenue += o.baseTotal;
      row.orders += 1;
    }
  }
  for (const u of newCustomers) {
    const row = byDay.get(dayKey(u.createdAt));
    if (row) row.customers += 1;
  }
  const label = (k: string) => new Date(`${k}T12:00:00Z`).toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });
  const series = [...byDay.entries()].map(([k, v]) => ({ key: k, label: label(k), ...v }));

  const revenue = orders.reduce((s, o) => s + o.baseTotal, 0);
  const categories = new Map<string, number>();
  const products = new Map<string, { name: string; qty: number; revenue: number; id: string | null }>();
  const currencies = new Map<string, number>();
  for (const o of orders) {
    currencies.set(o.currency, (currencies.get(o.currency) ?? 0) + o.baseTotal);
    for (const i of o.items) {
      const base = lineBase(i.lineTotal, o.fxRate);
      const cat = i.product?.category?.name ?? "Uncategorised";
      categories.set(cat, (categories.get(cat) ?? 0) + base);
      const key = i.productId ?? i.productName;
      const p = products.get(key) ?? { name: i.productName, qty: 0, revenue: 0, id: i.productId };
      p.qty += i.quantity;
      p.revenue += base;
      products.set(key, p);
    }
  }

  // Repeat customers: people with 2+ paid orders ever, among buyers in this period.
  const buyers = [...new Set(orders.map((o) => o.email))];
  const repeatRows = buyers.length
    ? await db.order.groupBy({ by: ["email"], where: { ...SALE_WHERE, email: { in: buyers } }, _count: true })
    : [];
  const repeat = repeatRows.filter((r) => r._count >= 2).length;

  return {
    revenue,
    orders: orders.length,
    aov: orders.length ? Math.round(revenue / orders.length) : 0,
    conversion: cartsCreated ? Math.round((orders.length / cartsCreated) * 1000) / 10 : null,
    cartsCreated,
    series,
    byCategory: [...categories.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
    bestSellers: [...products.values()].sort((a, b) => b.qty - a.qty).slice(0, 8),
    byCurrency: [...currencies.entries()].map(([label, value]) => ({ label, value })),
    buyers: buyers.length,
    repeat,
    newCustomers: newCustomers.length,
    abandoned,
  };
}

/** Bags with items that haven't been checked out for over an hour. */
export async function abandonedCarts(limit = 50) {
  const carts = await db.cart.findMany({
    where: { convertedAt: null, updatedAt: { lt: new Date(Date.now() - 3600000) }, items: { some: {} } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      user: { select: { name: true, email: true, marketingConsent: true } },
      items: { include: { variant: { include: { product: { select: { name: true } } } } } },
    },
  });
  const subs = await db.newsletterSubscriber.findMany({
    where: { email: { in: carts.map((c) => c.email || c.user?.email || "").filter(Boolean) }, status: "SUBSCRIBED" },
    select: { email: true },
  });
  const consented = new Set(subs.map((s) => s.email));
  return carts.map((c) => {
    const email = c.user?.email ?? c.email;
    return {
      id: c.id,
      customer: c.user?.name ?? null,
      email,
      canEmail: Boolean(email && (c.user?.marketingConsent || consented.has(email))),
      updatedAt: c.updatedAt,
      items: c.items.map((i) => ({ name: `${i.variant.product.name}${i.variant.name !== "Default" ? ` (${i.variant.name})` : ""}`, qty: i.quantity })),
      value: c.items.reduce((s, i) => s + (i.variant.salePrice && i.variant.salePrice < i.variant.price ? i.variant.salePrice : i.variant.price) * i.quantity, 0),
    };
  });
}
