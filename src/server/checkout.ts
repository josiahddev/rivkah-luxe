"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { findCart } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth/session";
import { CheckoutError, confirmPayment, createOrderFromCart, startPayment } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { fail, FRIENDLY_ERROR, str, zodFieldErrors, type ActionResult } from "@/lib/action";
import { testPaymentsAllowed } from "@/lib/payments";
import type { Prisma } from "@/generated/prisma/client";
import { postalRequired } from "@/lib/regions";
import { getDisplayCurrency } from "@/lib/currency";

const phone = z
  .string()
  .min(7, "Please enter a phone number we can reach you on")
  .max(24)
  .regex(/^[+\d(][\d\s().-]{6,}$/, "Please enter a valid phone number");

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Please enter your full name").max(120),
  email: z.email("Please enter a valid email address"),
  phone,
  addressLine1: z.string().min(5, "Please enter your street address").max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2, "Please enter your city").max(80),
  state: z.string().min(2, "Please enter your province or state").max(60),
  postalCode: z.string().max(12).optional(),
  country: z.string().length(2, "Please choose your country"),
  deliveryInstructions: z.string().max(500).optional(),
  currency: z.string().length(3),
}).superRefine((v, ctx) => {
  if (postalRequired(v.country) && !v.postalCode) ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Please enter your postal code" });
  if (v.country === "CA" && v.postalCode && !/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(v.postalCode)) ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Please enter a valid Canadian postal code (e.g. M5V 2T6)" });
  if (v.country === "US" && v.postalCode && !/^\d{5}(-\d{4})?$/.test(v.postalCode)) ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Please enter a valid ZIP code" });
});

export async function placeOrder(_prev: unknown, fd: FormData): Promise<ActionResult<{ redirectUrl: string; orderNumber: string }>> {
  const parsed = checkoutSchema.safeParse({
    customerName: str(fd, "customerName"),
    email: str(fd, "email").toLowerCase(),
    phone: str(fd, "phone"),
    addressLine1: str(fd, "addressLine1"),
    addressLine2: str(fd, "addressLine2") || undefined,
    city: str(fd, "city"),
    state: str(fd, "state"),
    postalCode: str(fd, "postalCode").toUpperCase() || undefined,
    country: str(fd, "country").toUpperCase(),
    deliveryInstructions: str(fd, "deliveryInstructions") || undefined,
    currency: (await getDisplayCurrency()).code,
  });
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error.issues));
  if (!(await rateLimit("checkout", 10, 600))) return fail("Too many attempts. Please wait a few minutes and try again.");

  const user = await getCurrentUser();
  const cart = await findCart(false);
  if (!cart) return fail("Your bag is empty.");

  try {
    const order = await createOrderFromCart(cart.id, { ...parsed.data, saveAddress: fd.get("saveAddress") === "on" }, user?.id ?? null);
    // Marketing emails only with an explicit, unticked-by-default opt-in (CASL).
    if (fd.get("newsletter") === "on") {
      await db.newsletterSubscriber.upsert({
        where: { email: order.email },
        create: { email: order.email, source: "checkout" },
        update: { status: "SUBSCRIBED" },
      });
    }
    const { authorizationUrl } = await startPayment(order.id);
    return { ok: true, data: { redirectUrl: authorizationUrl, orderNumber: order.orderNumber } };
  } catch (err) {
    if (err instanceof CheckoutError) return fail(err.message);
    console.error("[checkout]", err);
    return fail("We couldn't start your payment. Please try again in a moment.");
  }
}

/** Lets a customer try paying again for an unpaid order (from the "payment failed" page). */
export async function retryPayment(orderNumber: string, email: string): Promise<ActionResult<{ redirectUrl: string }>> {
  if (!(await rateLimit("retry-pay", 10, 600))) return fail("Too many attempts. Please wait a few minutes.");
  const order = await db.order.findFirst({ where: { orderNumber, email: email.toLowerCase() }, include: { items: { include: { variant: true } } } });
  if (!order) return fail("We couldn't find that order.");
  if (order.paymentStatus === "PAID") return fail("This order is already paid.");
  if (order.status === "CANCELLED") return fail("This order was cancelled. Please place a new order.");
  for (const item of order.items) {
    if (!item.variant || item.variant.stock < item.quantity)
      return fail(`Sorry, ${item.productName} is no longer in stock in that quantity. Please place a new order.`);
  }
  try {
    const { authorizationUrl } = await startPayment(order.id);
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "PENDING" } });
    return { ok: true, data: { redirectUrl: authorizationUrl } };
  } catch (err) {
    if (err instanceof CheckoutError) return fail(err.message);
    console.error("[retry-payment]", err);
    return fail(FRIENDLY_ERROR);
  }
}

/** Poll from the "confirming your payment" screen. Verification always happens on the server. */
export async function checkPayment(reference: string) {
  if (!(await rateLimit("check-pay", 60, 600))) return { outcome: "pending" as const };
  const r = await confirmPayment(reference);
  return { outcome: r.outcome, orderNumber: r.orderNumber };
}

/** Development only: pretend to be the payment provider. */
export async function simulateTestPayment(reference: string, outcome: "success" | "failed" | "cancelled") {
  if (!testPaymentsAllowed()) return { ok: false };
  const payment = await db.payment.findUnique({ where: { reference } });
  if (!payment || payment.provider !== "test") return { ok: false };
  await db.payment.update({ where: { id: payment.id }, data: { raw: { testOutcome: outcome } as Prisma.InputJsonValue } });
  return { ok: true };
}
