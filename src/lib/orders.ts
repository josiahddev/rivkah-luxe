import "server-only";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/auth/tokens";
import { effectivePrice, syncProduct, VISIBLE_STATUSES } from "@/lib/catalog";
import { computeTotals } from "@/lib/pricing";
import { convert, formatMoney, type CurrencyConfig } from "@/lib/money";
import { enabledCurrencies } from "@/lib/currency";
import { getProviderByName, providerForCurrency } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { sendEmail } from "@/lib/email/send";
import { adminAlertEmail, orderReceivedEmail, orderStatusEmail, paymentConfirmedEmail, type EmailOrder } from "@/lib/email/templates";
import { audit, notifyAdmin } from "@/lib/audit";
import { siteUrl } from "@/lib/utils";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import type { OrderStatus } from "@/generated/prisma/enums";

export class CheckoutError extends Error {}

export type CheckoutInput = {
  customerName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string; // ISO code
  deliveryInstructions?: string;
  saveAddress?: boolean;
  currency: string;
};

/**
 * Pick the currency to charge in: the shopper's chosen currency if a connected
 * payment provider accepts it, otherwise the store's base currency.
 */
export async function chargeCurrency(preferred: string): Promise<CurrencyConfig | null> {
  const list = await enabledCurrencies();
  const wanted = list.find((c) => c.code === preferred);
  if (wanted && providerForCurrency(wanted.code)) return wanted;
  const base = list[0];
  return providerForCurrency(base.code) ? base : null;
}

/**
 * Create a PENDING order from the shopper's cart. Re-validates every line
 * against the database (product exists, variant exists, current price, stock
 * available, coupon valid, delivery zone valid) and computes totals on the server.
 */
export async function createOrderFromCart(cartId: string, input: CheckoutInput, userId: string | null) {
  const cart = await db.cart.findUnique({
    where: { id: cartId },
    include: { items: { include: { variant: { include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } } } } } },
  });
  if (!cart || cart.items.length === 0) throw new CheckoutError("Your bag is empty.");

  const cur = await chargeCurrency(input.currency);
  if (!cur) throw new CheckoutError("Online payment isn't available right now. Please contact us to complete your order.");

  const lines = cart.items.map((item) => {
    const v = item.variant;
    const p = v.product;
    if (!v.isActive || !VISIBLE_STATUSES.includes(p.status) || p.status === "OUT_OF_STOCK")
      throw new CheckoutError(`${p.name} is no longer available. Please remove it from your bag.`);
    if (v.stock < item.quantity)
      throw new CheckoutError(
        v.stock > 0
          ? `Only ${v.stock} of ${p.name}${v.name !== "Default" ? ` (${v.name})` : ""} left. Please update your bag.`
          : `${p.name} just sold out. Please remove it from your bag.`,
      );
    const basePrice = effectivePrice(v);
    return {
      variant: v,
      product: p,
      quantity: item.quantity,
      unitPrice: convert(basePrice, cur),
      priced: { productId: p.id, categoryId: p.categoryId, unitPrice: basePrice, quantity: item.quantity },
    };
  });

  const totals = await computeTotals({
    lines: lines.map((l) => l.priced),
    currency: cur,
    couponCode: cart.couponCode,
    email: input.email,
    country: input.country,
    region: input.state,
  });
  if (cart.couponCode && totals.couponError) throw new CheckoutError(`Discount code: ${totals.couponError}`);
  if (!totals.zone) throw new CheckoutError("We don't ship to that location yet. Please contact us and we'll help.");
  if (totals.total <= 0) throw new CheckoutError("Your order total must be more than zero.");

  const settings = await getSettings();
  const email = input.email.trim().toLowerCase();
  const baseTotal = cur.rate === 1 ? totals.total : Math.round(totals.total / cur.rate);

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: `TMP-${randomToken(8)}`,
        userId,
        cartId: cart.id,
        customerName: input.customerName,
        email,
        phone: input.phone,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 || null,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode || null,
        country: input.country,
        deliveryInstructions: input.deliveryInstructions || null,
        shippingZoneId: totals.zone!.id,
        shippingZoneName: totals.zone!.name,
        deliveryEstimate: totals.zone!.estimatedDelivery,
        subtotal: totals.subtotal,
        discountTotal: totals.discount,
        shippingFee: totals.shippingFee,
        taxTotal: totals.tax,
        total: totals.total,
        currency: cur.code,
        baseCurrency: settings.currency,
        fxRate: cur.rate,
        baseTotal,
        couponCode: totals.couponCode,
        couponId: totals.couponId,
        items: {
          create: lines.map((l) => ({
            productId: l.product.id,
            variantId: l.variant.id,
            productName: l.product.name,
            variantName: l.variant.name === "Default" ? null : l.variant.name,
            sku: l.variant.sku,
            imageUrl: l.variant.imageUrl || l.product.images[0]?.url || null,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            lineTotal: l.unitPrice * l.quantity,
          })),
        },
        history: { create: { status: "PENDING", note: "Order placed, waiting for payment." } },
      },
    });
    return tx.order.update({ where: { id: created.id }, data: { orderNumber: `RL${10000 + created.number}` } });
  });

  await db.cart.update({ where: { id: cart.id }, data: { email } });

  if (userId && input.saveAddress) {
    const exists = await db.address.findFirst({ where: { userId, line1: input.addressLine1, city: input.city } });
    if (!exists) {
      const count = await db.address.count({ where: { userId } });
      await db.address.create({
        data: {
          userId, fullName: input.customerName, phone: input.phone, line1: input.addressLine1, line2: input.addressLine2 || null,
          city: input.city, state: input.state, postalCode: input.postalCode || null, country: input.country, isDefault: count === 0,
        },
      });
    }
  }
  return order;
}

/** Create a payment attempt for a pending order and get the provider's hosted payment page. */
export async function startPayment(orderId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (order.paymentStatus === "PAID") throw new CheckoutError("This order has already been paid.");
  const provider = providerForCurrency(order.currency);
  if (!provider) throw new CheckoutError("Online payment isn't available right now. Please contact us to complete your order.");
  const settings = await getSettings();
  const reference = `${order.orderNumber}-${randomToken(6).replace(/[^a-zA-Z0-9]/g, "x")}`;
  const payment = await db.payment.create({
    data: { orderId: order.id, provider: provider.name, reference, amount: order.total, currency: order.currency },
  });
  const itemsText = order.items.map((i) => `${i.productName}${i.variantName ? ` (${i.variantName})` : ""} × ${i.quantity}`).join(", ");
  const { authorizationUrl, providerRef } = await provider.initialize({
    reference,
    amount: order.total,
    currency: order.currency,
    email: order.email,
    description: `${settings.storeName} order ${order.orderNumber} — ${itemsText}`.slice(0, 250),
    successUrl: siteUrl(`/checkout/verify?reference=${encodeURIComponent(reference)}`),
    cancelUrl: siteUrl(`/checkout/verify?reference=${encodeURIComponent(reference)}&cancelled=1`),
    metadata: { orderId: order.id, orderNumber: order.orderNumber },
  });
  if (providerRef) await db.payment.update({ where: { id: payment.id }, data: { providerRef } });
  await db.order.update({ where: { id: order.id }, data: { paymentProvider: provider.name } });
  return { reference, authorizationUrl };
}

async function loadOrderForEmail(orderId: string): Promise<EmailOrder> {
  return (await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } })) as unknown as EmailOrder;
}

export type ConfirmOutcome = "paid" | "already-paid" | "failed" | "cancelled" | "pending" | "mismatch" | "unknown";

/**
 * Verify a payment with the provider's API (server-side) and, if successful,
 * mark the order paid, reduce stock, record coupon use and send emails.
 * Safe to call many times for the same reference (redirect + webhook).
 */
export async function confirmPayment(reference: string): Promise<{ outcome: ConfirmOutcome; orderId?: string; orderNumber?: string; email?: string }> {
  const payment = await db.payment.findUnique({ where: { reference }, include: { order: true } });
  if (!payment) return { outcome: "unknown" };
  const order = payment.order;
  const base = { orderId: order.id, orderNumber: order.orderNumber, email: order.email };
  if (payment.status === "PAID" || order.paymentStatus === "PAID") return { outcome: "already-paid", ...base };

  const provider = getProviderByName(payment.provider);
  if (!provider) return { outcome: "pending", ...base };

  let result;
  try {
    result = await provider.verify(reference);
  } catch (err) {
    console.error("[payments] verify failed", err);
    return { outcome: "pending", ...base };
  }

  if (result.status === "pending") return { outcome: "pending", ...base };

  if (result.status === "failed" || result.status === "abandoned") {
    const status = result.status === "failed" ? "FAILED" : "CANCELLED";
    await db.payment.update({ where: { id: payment.id }, data: { status, gatewayResponse: result.gatewayResponse, channel: result.channel, raw: result.raw as object } });
    await db.order.updateMany({ where: { id: order.id, paymentStatus: { not: "PAID" } }, data: { paymentStatus: status } });
    if (status === "FAILED") {
      await notifyAdmin("PAYMENT_FAILED", `Payment failed for ${order.orderNumber}`, `${order.customerName} · ${formatMoney(order.total, order.currency)} · ${result.gatewayResponse ?? ""}`, `/admin/orders/${order.id}`);
    }
    return { outcome: status === "FAILED" ? "failed" : "cancelled", ...base };
  }

  // Success — the money received must match the order.
  if (result.amount < order.total || result.currency.toUpperCase() !== order.currency) {
    await db.payment.update({ where: { id: payment.id }, data: { gatewayResponse: "Amount mismatch", raw: result.raw as object } });
    await db.order.update({
      where: { id: order.id },
      data: { needsAttention: `Payment of ${formatMoney(result.amount, result.currency)} did not match the order total ${formatMoney(order.total, order.currency)}.` },
    });
    await notifyAdmin("ATTENTION", `Check payment for ${order.orderNumber}`, "The amount paid didn't match the order total.", `/admin/orders/${order.id}`);
    return { outcome: "mismatch", ...base };
  }

  const lowStock: { name: string; stock: number; threshold: number }[] = [];
  let stockProblem: string | null = null;

  const processed = await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt: result.paidAt ?? new Date(), channel: result.channel, gatewayResponse: result.gatewayResponse, raw: result.raw as object },
    });
    // Conditional update: only the first confirmation wins.
    const claimed = await tx.order.updateMany({
      where: { id: order.id, paymentStatus: { not: "PAID" } },
      data: { paymentStatus: "PAID", status: "PAYMENT_CONFIRMED", paidAt: new Date() },
    });
    if (claimed.count === 0) return false;

    await tx.orderStatusHistory.create({
      data: { orderId: order.id, status: "PAYMENT_CONFIRMED", note: `Payment verified with ${provider.label} (ref ${reference}).` },
    });

    const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
    for (const item of items) {
      if (!item.variantId) continue;
      const dec = await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity }, soldCount: { increment: item.quantity } },
      });
      if (dec.count === 0) {
        stockProblem = `Not enough stock for ${item.productName}${item.variantName ? ` (${item.variantName})` : ""} when payment arrived.`;
        continue;
      }
      const v = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId }, include: { product: { select: { name: true } } } });
      await tx.inventoryMovement.create({
        data: { variantId: v.id, change: -item.quantity, stockAfter: v.stock, reason: "ORDER", orderId: order.id, note: order.orderNumber },
      });
      if (v.stock <= v.lowStockThreshold) lowStock.push({ name: `${v.product.name}${v.name !== "Default" ? ` (${v.name})` : ""}`, stock: v.stock, threshold: v.lowStockThreshold });
    }
    await tx.order.update({ where: { id: order.id }, data: { stockDeducted: true, needsAttention: stockProblem } });

    if (order.couponId) {
      await tx.couponUsage.upsert({
        where: { orderId: order.id },
        create: { couponId: order.couponId, orderId: order.id, email: order.email, userId: order.userId },
        update: {},
      });
      await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
    }

    if (order.cartId) {
      const cart = await tx.cart.findUnique({ where: { id: order.cartId } });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({ where: { id: cart.id }, data: { convertedAt: new Date(), couponCode: null } });
      }
    }
    return true;
  });

  if (!processed) return { outcome: "already-paid", ...base };

  const productIds = await db.orderItem.findMany({ where: { orderId: order.id }, select: { productId: true } });
  for (const { productId } of productIds) if (productId) await syncProduct(productId).catch(() => {});

  const settings = await getSettings();
  const full = await loadOrderForEmail(order.id);
  await sendEmail({ to: order.email, ...orderReceivedEmail(settings, full) });
  await sendEmail({ to: order.email, ...paymentConfirmedEmail(settings, full, reference) });

  const money = formatMoney(order.total, order.currency) + (order.currency !== order.baseCurrency ? ` (≈ ${formatMoney(order.baseTotal, order.baseCurrency)})` : "");
  await notifyAdmin("NEW_ORDER", `New order ${order.orderNumber}`, `${order.customerName} · ${money}`, `/admin/orders/${order.id}`);
  await notifyAdmin("PAYMENT_SUCCEEDED", `Payment received for ${order.orderNumber}`, money, `/admin/orders/${order.id}`);
  if (stockProblem) await notifyAdmin("ATTENTION", `Stock problem on ${order.orderNumber}`, stockProblem, `/admin/orders/${order.id}`);
  for (const l of lowStock) {
    await notifyAdmin(
      l.stock <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
      l.stock <= 0 ? `${l.name} is out of stock` : `${l.name} is running low`,
      `${l.stock} left (alert at ${l.threshold}).`,
      "/admin/inventory",
    );
  }
  const alertTo = settings.email.orderAlertEmail || settings.businessEmail;
  if (alertTo) {
    await sendEmail({
      to: alertTo,
      ...adminAlertEmail(settings, `New order ${order.orderNumber}`, [
        `${order.customerName} (${order.email}, ${order.phone})`,
        `Total: ${money}`,
        `Ship to: ${order.city}, ${order.state}, ${order.country}`,
      ], siteUrl(`/admin/orders/${order.id}`)),
    });
  }
  return { outcome: "paid", ...base };
}

/** Owner changes an order's status. Handles restocking and customer emails. */
export async function changeOrderStatus(
  orderId: string,
  status: OrderStatus,
  actor: { id: string; name: string },
  opts: { note?: string; notifyCustomer?: boolean } = {},
) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (order.status === status) return order;
  const restock = (status === "CANCELLED" || status === "REFUNDED") && order.stockDeducted;

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === "REFUNDED" ? { paymentStatus: "REFUNDED" } : {}),
        ...(status === "CANCELLED" && order.paymentStatus !== "PAID" ? { paymentStatus: "CANCELLED" } : {}),
        ...(restock ? { stockDeducted: false } : {}),
      },
    });
    await tx.orderStatusHistory.create({ data: { orderId, status, note: opts.note || null, byName: actor.name } });
    if (restock) {
      for (const item of order.items) {
        if (!item.variantId) continue;
        const v = await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity }, soldCount: { decrement: item.quantity } },
        });
        await tx.inventoryMovement.create({
          data: {
            variantId: v.id, change: item.quantity, stockAfter: v.stock,
            reason: status === "REFUNDED" ? "REFUND" : "ORDER_CANCELLED", orderId, userId: actor.id, note: order.orderNumber,
          },
        });
      }
    }
  });

  if (restock) for (const i of order.items) if (i.productId) await syncProduct(i.productId).catch(() => {});

  await audit(actor, "Changed order status", "Order", orderId,
    `${actor.name} changed order ${order.orderNumber} from ${ORDER_STATUS_LABEL[order.status]} to ${ORDER_STATUS_LABEL[status]}.`);

  if (opts.notifyCustomer !== false) {
    const settings = await getSettings();
    const email = orderStatusEmail(settings, await loadOrderForEmail(orderId), opts.note);
    if (email) await sendEmail({ to: order.email, ...email });
  }
  return db.order.findUniqueOrThrow({ where: { id: orderId } });
}
