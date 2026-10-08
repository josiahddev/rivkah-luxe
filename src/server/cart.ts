"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { findCart, getCartView, MAX_QTY_PER_LINE, type CartView } from "@/lib/cart";
import { VISIBLE_STATUSES } from "@/lib/catalog";
import { rateLimit } from "@/lib/rate-limit";
import { FRIENDLY_ERROR } from "@/lib/action";
import { cookies } from "next/headers";
import { CURRENCY_COOKIE, enabledCurrencies } from "@/lib/currency";

type CartResult = { ok: true; cart: CartView; message?: string } | { ok: false; error: string; cart?: CartView };

export async function getCart(): Promise<CartView> {
  return getCartView();
}

const addSchema = z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(MAX_QTY_PER_LINE) });

export async function addToCart(variantId: string, quantity = 1): Promise<CartResult> {
  const parsed = addSchema.safeParse({ variantId, quantity });
  if (!parsed.success) return { ok: false, error: "Please choose a valid option." };
  try {
    if (!(await rateLimit("cart", 120, 60))) return { ok: false, error: "Too many requests — please slow down a little." };
    const variant = await db.productVariant.findUnique({ where: { id: variantId }, include: { product: { select: { status: true, name: true } } } });
    if (!variant || !variant.isActive || !VISIBLE_STATUSES.includes(variant.product.status))
      return { ok: false, error: "Sorry, this item is no longer available." };
    if (variant.product.status === "OUT_OF_STOCK" || variant.stock <= 0) return { ok: false, error: "Sorry, this item is out of stock." };

    const cart = await findCart(true);
    if (!cart) return { ok: false, error: FRIENDLY_ERROR };
    const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
    const desired = (existing?.quantity ?? 0) + parsed.data.quantity;
    const allowed = Math.min(desired, variant.stock, MAX_QTY_PER_LINE);
    if (existing && existing.quantity >= allowed) {
      return { ok: false, error: `You already have the last ${variant.stock === 1 ? "one" : variant.stock} in your bag.`, cart: await getCartView() };
    }
    await db.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, quantity: allowed },
      update: { quantity: allowed },
    });
    await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date(), convertedAt: null } });
    const view = await getCartView();
    return {
      ok: true,
      cart: view,
      message: allowed < desired ? `Only ${variant.stock} available — we added what we could.` : `${variant.product.name} added to your bag.`,
    };
  } catch (err) {
    console.error("[cart:add]", err);
    return { ok: false, error: FRIENDLY_ERROR };
  }
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartResult> {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QTY_PER_LINE) return { ok: false, error: "Please choose a valid quantity." };
  try {
    const cart = await findCart(false);
    if (!cart) return { ok: false, error: "Your bag has expired. Please add the item again." };
    const item = await db.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: true } });
    if (!item) return { ok: true, cart: await getCartView() };
    if (quantity === 0) {
      await db.cartItem.delete({ where: { id: item.id } });
      return { ok: true, cart: await getCartView(), message: "Removed from your bag." };
    }
    const qty = Math.min(quantity, Math.max(item.variant.stock, 0));
    if (qty <= 0) return { ok: false, error: "Sorry, this item is out of stock.", cart: await getCartView() };
    await db.cartItem.update({ where: { id: item.id }, data: { quantity: qty } });
    await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
    return qty < quantity
      ? { ok: false, error: `Only ${item.variant.stock} available.`, cart: await getCartView() }
      : { ok: true, cart: await getCartView() };
  } catch (err) {
    console.error("[cart:update]", err);
    return { ok: false, error: FRIENDLY_ERROR };
  }
}

export async function removeCartItem(itemId: string) {
  return updateCartItem(itemId, 0);
}

export async function applyCoupon(code: string): Promise<CartResult> {
  const clean = code.trim().toUpperCase().slice(0, 40);
  if (!clean) return { ok: false, error: "Please enter a code." };
  try {
    if (!(await rateLimit("coupon", 15, 300))) return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
    const cart = await findCart(false);
    if (!cart) return { ok: false, error: "Add something to your bag first." };
    await db.cart.update({ where: { id: cart.id }, data: { couponCode: clean } });
    const view = await getCartView();
    if (view.totals.couponError) {
      await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
      return { ok: false, error: view.totals.couponError, cart: await getCartView() };
    }
    return { ok: true, cart: view, message: `Code ${view.totals.couponCode} applied.` };
  } catch (err) {
    console.error("[cart:coupon]", err);
    return { ok: false, error: FRIENDLY_ERROR };
  }
}

export async function removeCoupon(): Promise<CartResult> {
  const cart = await findCart(false);
  if (cart) await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  return { ok: true, cart: await getCartView() };
}

/** Recalculate totals for the checkout page as the shopper changes country/province. */
export async function previewTotals(country: string, region: string, email: string | null) {
  const view = await getCartView({ country: country.slice(0, 2), region: region.slice(0, 60), email });
  return view.totals;
}

/** Switch the currency prices are shown in. */
export async function setCurrency(code: string) {
  const list = await enabledCurrencies();
  if (!list.some((c) => c.code === code)) return { ok: false };
  const jar = await cookies();
  jar.set(CURRENCY_COOKIE, code, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" });
  return { ok: true };
}
