import "server-only";
import { db } from "@/lib/db";
import { convert, formatMoney, type CurrencyConfig } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import type { Coupon, ShippingZone } from "@/generated/prisma/client";

// All totals are calculated here, on the server, from database prices.
// Nothing the browser sends about prices or totals is ever trusted.
//
// Catalogue prices, shipping fees and coupon amounts are stored in the base
// currency. They are converted to the shopper's currency line by line, so the
// numbers the customer sees always add up exactly.

export type PricedLine = {
  productId: string;
  categoryId: string | null;
  unitPrice: number; // base currency
  quantity: number;
};

type CouponWithScope = Coupon & { products: { id: string }[]; categories: { id: string }[] };

export async function findCoupon(code: string) {
  if (!code) return null;
  return db.coupon.findFirst({
    where: { code: { equals: code.trim(), mode: "insensitive" } },
    include: { products: { select: { id: true } }, categories: { select: { id: true } } },
  });
}

function eligible(coupon: CouponWithScope, lines: PricedLine[]) {
  const productIds = new Set(coupon.products.map((p) => p.id));
  const categoryIds = new Set(coupon.categories.map((c) => c.id));
  const scoped = productIds.size > 0 || categoryIds.size > 0;
  return lines.filter((l) => !scoped || productIds.has(l.productId) || (l.categoryId && categoryIds.has(l.categoryId)));
}

/** Returns an error message a customer can understand, or null when the coupon can be used. */
export async function couponProblem(
  coupon: CouponWithScope | null,
  ctx: { lines: PricedLine[]; email?: string | null; baseCurrency: string },
): Promise<string | null> {
  if (!coupon || !coupon.isActive) return "This code isn't valid.";
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return "This code isn't active yet.";
  if (coupon.endsAt && coupon.endsAt < now) return "This code has expired.";
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return "This code has reached its usage limit.";
  const subtotal = ctx.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount)
    return `Spend ${formatMoney(coupon.minOrderAmount, ctx.baseCurrency)} (${ctx.baseCurrency}) or more to use this code.`;
  if (eligible(coupon, ctx.lines).length === 0) return "This code doesn't apply to the items in your bag.";
  if (ctx.email) {
    const email = ctx.email.toLowerCase();
    if (coupon.usageLimitPerCustomer) {
      const used = await db.couponUsage.count({ where: { couponId: coupon.id, email } });
      if (used >= coupon.usageLimitPerCustomer) return "You've already used this code.";
    }
    if (coupon.firstOrderOnly) {
      const previous = await db.order.count({ where: { email: { equals: email, mode: "insensitive" }, paymentStatus: "PAID" } });
      if (previous > 0) return "This code is for first orders only.";
    }
  }
  return null;
}

/** Pick the delivery zone for a destination: most specific match wins (country + region, then country, then fallback). */
export async function resolveShippingZone(country: string | null | undefined, region: string | null | undefined, zoneId?: string | null) {
  const zones = await db.shippingZone.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  if (zoneId) {
    const z = zones.find((z) => z.id === zoneId);
    if (z) return z;
  }
  const c = (country || "").toUpperCase();
  const r = (region || "").trim().toLowerCase();
  if (c) {
    const withRegion = zones.find((z) => !z.isFallback && z.countries.includes(c) && z.regions.length > 0 && z.regions.some((x) => x.toLowerCase() === r));
    if (withRegion) return withRegion;
    const countryWide = zones.find((z) => !z.isFallback && z.countries.includes(c) && z.regions.length === 0);
    if (countryWide) return countryWide;
  }
  return zones.find((z) => z.isFallback) ?? null;
}

export function taxRateFor(settings: Awaited<ReturnType<typeof getSettings>>, country: string | null | undefined, region: string | null | undefined) {
  const t = settings.tax;
  if (!t.enabled) return 0;
  if (t.mode === "flat") return t.flatRatePercent;
  if (!country) return 0;
  if (country.toUpperCase() !== "CA") return t.chargeInternational ? t.flatRatePercent : 0;
  return t.provinceRates[(region || "").toUpperCase()] ?? 0;
}

export type Totals = {
  currency: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  taxRate: number;
  taxLabel: string;
  total: number;
  freeShipping: boolean;
  couponCode: string | null;
  couponId: string | null;
  couponError: string | null;
  couponLabel: string | null;
  zone: (Pick<ShippingZone, "id" | "name" | "estimatedDelivery"> & { fee: number; freeOverAmount: number | null }) | null;
  amountToFreeShipping: number | null;
  /** Whether a destination was given (otherwise delivery & tax are estimates). */
  destinationKnown: boolean;
};

export async function computeTotals(input: {
  lines: PricedLine[];
  currency: CurrencyConfig;
  couponCode?: string | null;
  email?: string | null;
  country?: string | null;
  region?: string | null;
  zoneId?: string | null;
}): Promise<Totals> {
  const settings = await getSettings();
  const cur = input.currency;
  const fx = (n: number) => convert(n, cur);

  const lineTotal = (l: PricedLine) => fx(l.unitPrice) * l.quantity;
  const subtotal = input.lines.reduce((s, l) => s + lineTotal(l), 0);

  let discount = 0;
  let freeShipping = false;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  let couponError: string | null = null;
  let couponLabel: string | null = null;

  if (input.couponCode) {
    const coupon = await findCoupon(input.couponCode);
    const problem = await couponProblem(coupon, { lines: input.lines, email: input.email, baseCurrency: settings.currency });
    if (problem || !coupon) {
      couponError = problem;
    } else {
      couponId = coupon.id;
      couponCode = coupon.code;
      const eligibleSubtotal = eligible(coupon, input.lines).reduce((s, l) => s + lineTotal(l), 0);
      if (coupon.type === "PERCENTAGE") {
        discount = Math.round((eligibleSubtotal * Math.min(100, coupon.value)) / 100);
        couponLabel = `${coupon.value}% off`;
      } else if (coupon.type === "FIXED") {
        discount = Math.min(fx(coupon.value), eligibleSubtotal);
        couponLabel = `${formatMoney(fx(coupon.value), cur.code)} off`;
      } else {
        freeShipping = true;
        couponLabel = "Free delivery";
      }
    }
  }

  const destinationKnown = Boolean(input.country);
  const zone = await resolveShippingZone(input.country, input.region, input.zoneId);
  const afterDiscount = subtotal - discount;
  const zoneFee = zone ? fx(zone.fee) : 0;
  const zoneFree = zone?.freeOverAmount ? fx(zone.freeOverAmount) : null;
  let shippingFee = zoneFee;
  let amountToFreeShipping: number | null = null;
  if (zoneFree) {
    if (afterDiscount >= zoneFree) shippingFee = 0;
    else amountToFreeShipping = zoneFree - afterDiscount;
  }
  if (freeShipping) shippingFee = 0;
  if (subtotal === 0) shippingFee = 0;

  // Tax applies to goods after discount plus shipping (as CRA requires for GST/HST).
  const taxRate = taxRateFor(settings, input.country, input.region);
  const tax = taxRate ? Math.round(((afterDiscount + shippingFee) * taxRate) / 100) : 0;

  return {
    currency: cur.code,
    subtotal,
    discount,
    shippingFee,
    tax,
    taxRate,
    taxLabel: settings.tax.label,
    total: Math.max(0, afterDiscount + shippingFee + tax),
    freeShipping: shippingFee === 0 && subtotal > 0,
    couponCode,
    couponId,
    couponError,
    couponLabel,
    zone: zone ? { id: zone.id, name: zone.name, estimatedDelivery: zone.estimatedDelivery, fee: zoneFee, freeOverAmount: zoneFree } : null,
    amountToFreeShipping,
    destinationKnown,
  };
}
