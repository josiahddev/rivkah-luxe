import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { randomToken } from "@/lib/auth/tokens";
import { effectivePrice, VISIBLE_STATUSES } from "@/lib/catalog";
import { computeTotals, type Totals } from "@/lib/pricing";
import { convert, type CurrencyConfig } from "@/lib/money";
import { getDisplayCurrency } from "@/lib/currency";

export const CART_COOKIE = "rl_cart";
export const MAX_QTY_PER_LINE = 20;

const itemInclude = {
  variant: {
    include: {
      product: {
        select: {
          id: true, name: true, slug: true, status: true, categoryId: true,
          images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
        },
      },
    },
  },
};

async function setCartCookie(token: string) {
  const jar = await cookies();
  jar.set(CART_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

/** Find the shopper's cart (signed-in user's cart, else the cookie cart). Optionally create one. */
export async function findCart(create = false) {
  const user = await getCurrentUser();
  if (user) {
    const existing = await db.cart.findUnique({ where: { userId: user.id } });
    if (existing || !create) return existing;
    return db.cart.create({ data: { token: randomToken(), userId: user.id, email: user.email } });
  }
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (token) {
    const cart = await db.cart.findUnique({ where: { token } });
    if (cart && !cart.userId) return cart;
  }
  if (!create) return null;
  const cart = await db.cart.create({ data: { token: randomToken() } });
  await setCartCookie(cart.token);
  return cart;
}

/** After sign-in: move the guest cart's items into the user's cart. */
export async function mergeGuestCart(userId: string, email: string) {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  const guest = token ? await db.cart.findUnique({ where: { token }, include: { items: true } }) : null;
  let userCart = await db.cart.findUnique({ where: { userId } });
  if (!userCart) {
    if (guest && !guest.userId) {
      await db.cart.update({ where: { id: guest.id }, data: { userId, email } });
      return;
    }
    userCart = await db.cart.create({ data: { token: randomToken(), userId, email } });
  }
  if (guest && !guest.userId && guest.id !== userCart.id) {
    for (const item of guest.items) {
      await db.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
        create: { cartId: userCart.id, variantId: item.variantId, quantity: item.quantity },
        update: { quantity: { increment: item.quantity } },
      });
    }
    if (!userCart.couponCode && guest.couponCode) {
      await db.cart.update({ where: { id: userCart.id }, data: { couponCode: guest.couponCode } });
    }
    await db.cart.delete({ where: { id: guest.id } });
  }
  jar.delete(CART_COOKIE);
}

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantName: string | null;
  image: string | null;
  unitPrice: number; // in the cart's display currency
  basePrice: number; // in the base currency
  compareAt: number | null;
  quantity: number;
  lineTotal: number;
  stock: number;
  available: boolean;
  issue: string | null;
  categoryId: string | null;
};

export type CartView = {
  currency: string;
  lines: CartLine[];
  count: number;
  totals: Totals;
  couponCode: string | null;
  hasIssues: boolean;
};

const emptyTotals = (currency: string): Totals => ({
  currency, taxRate: 0, taxLabel: "Tax", destinationKnown: false,
  subtotal: 0, discount: 0, shippingFee: 0, tax: 0, total: 0, freeShipping: false,
  couponCode: null, couponId: null, couponError: null, couponLabel: null, zone: null, amountToFreeShipping: null,
});

/**
 * The cart with live prices and stock from the database. Lines that can no
 * longer be bought are flagged (not silently removed) so the shopper sees why.
 */
export async function getCartView(
  opts: { country?: string | null; region?: string | null; email?: string | null; zoneId?: string | null; currency?: CurrencyConfig } = {},
): Promise<CartView> {
  const cur = opts.currency ?? (await getDisplayCurrency());
  const cart = await findCart(false);
  if (!cart) return { currency: cur.code, lines: [], count: 0, totals: emptyTotals(cur.code), couponCode: null, hasIssues: false };
  const items = await db.cartItem.findMany({ where: { cartId: cart.id }, include: itemInclude, orderBy: { createdAt: "asc" } });

  const lines: CartLine[] = items.map((item) => {
    const v = item.variant;
    const p = v.product;
    const visible = VISIBLE_STATUSES.includes(p.status) && p.status !== "OUT_OF_STOCK" && v.isActive;
    const basePrice = effectivePrice(v);
    const unitPrice = convert(basePrice, cur);
    let issue: string | null = null;
    if (!visible) issue = "No longer available";
    else if (v.stock <= 0) issue = "Out of stock";
    else if (item.quantity > v.stock) issue = `Only ${v.stock} left`;
    const isDefaultOnly = v.isDefault && v.name.toLowerCase() === "default";
    return {
      id: item.id,
      variantId: v.id,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      variantName: isDefaultOnly ? null : v.name,
      image: v.imageUrl || p.images[0]?.url || null,
      unitPrice,
      basePrice,
      compareAt: basePrice < v.price ? convert(v.price, cur) : null,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
      stock: v.stock,
      available: visible && v.stock > 0,
      issue,
      categoryId: p.categoryId,
    };
  });

  const buyable = lines.filter((l) => l.available).map((l) => ({
    productId: l.productId,
    categoryId: l.categoryId,
    unitPrice: l.basePrice,
    quantity: Math.min(l.quantity, l.stock),
  }));

  const totals = await computeTotals({
    lines: buyable,
    currency: cur,
    couponCode: cart.couponCode,
    email: opts.email ?? cart.email,
    country: opts.country,
    region: opts.region,
    zoneId: opts.zoneId,
  });

  return {
    currency: cur.code,
    lines,
    count: lines.reduce((s, l) => s + l.quantity, 0),
    totals,
    couponCode: cart.couponCode,
    hasIssues: lines.some((l) => l.issue !== null),
  };
}

export async function cartCount() {
  const cart = await findCart(false);
  if (!cart) return 0;
  const agg = await db.cartItem.aggregate({ where: { cartId: cart.id }, _sum: { quantity: true } });
  return agg._sum.quantity ?? 0;
}
