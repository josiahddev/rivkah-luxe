import "server-only";
import { createHmac } from "crypto";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { safeEqual } from "@/lib/auth/tokens";

// Payment providers. Secret keys only ever live in environment variables on the
// server and are never sent to the browser. An order is only marked paid after
// the provider's API confirms it (see confirmPayment in lib/orders.ts).
//
//   • Stripe   — Canadian/international cards, Apple Pay, Google Pay (CAD, USD, …)
//   • Paystack — Nigerian shoppers paying in naira (card, bank transfer, USSD)
//   • Test     — development only, simulates success/failure locally

export type VerifyResult = {
  status: "success" | "failed" | "abandoned" | "pending";
  amount: number; // minor units
  currency: string;
  channel?: string;
  gatewayResponse?: string;
  paidAt?: Date;
  raw: unknown;
};

export type InitInput = {
  reference: string;
  amount: number;
  currency: string;
  email: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
};

export type InitResult = { authorizationUrl: string; providerRef?: string };

export type ProviderName = "stripe" | "paystack" | "test";

export interface PaymentProvider {
  name: ProviderName;
  label: string;
  currencies: string[] | "any";
  initialize(input: InitInput): Promise<InitResult>;
  verify(reference: string): Promise<VerifyResult>;
}

// ───────────── Stripe (Checkout Sessions) ─────────────
// Docs: https://docs.stripe.com/payments/checkout

let stripeClient: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

const stripeProvider: PaymentProvider = {
  name: "stripe",
  label: "Stripe",
  currencies: ["CAD", "USD", "GBP", "EUR", "AUD"],
  async initialize(i) {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: i.email,
      client_reference_id: i.reference,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: i.currency.toLowerCase(),
            unit_amount: i.amount,
            product_data: { name: i.description },
          },
        },
      ],
      success_url: i.successUrl,
      cancel_url: i.cancelUrl,
      metadata: { ...i.metadata, reference: i.reference },
      payment_intent_data: { metadata: { ...i.metadata, reference: i.reference } },
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { authorizationUrl: session.url, providerRef: session.id };
  },
  async verify(reference) {
    const payment = await db.payment.findUnique({ where: { reference } });
    if (!payment?.providerRef) throw new Error("Missing Stripe session id");
    const s = await stripe().checkout.sessions.retrieve(payment.providerRef, { expand: ["payment_intent"] });
    const pi = typeof s.payment_intent === "object" ? s.payment_intent : null;
    let status: VerifyResult["status"] = "pending";
    if (s.status === "complete" && s.payment_status === "paid") status = "success";
    else if (s.status === "expired") status = "abandoned";
    else if (pi?.status === "canceled") status = "failed";
    return {
      status,
      amount: s.amount_total ?? 0,
      currency: (s.currency ?? "").toUpperCase(),
      channel: pi?.payment_method_types?.[0] ?? "card",
      gatewayResponse: pi?.last_payment_error?.message ?? s.payment_status,
      paidAt: status === "success" ? new Date() : undefined,
      raw: { id: s.id, status: s.status, payment_status: s.payment_status, payment_intent: pi?.id },
    };
  },
};

export function stripeWebhookEvent(rawBody: string, signature: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) return null;
  try {
    return stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return null;
  }
}

// ───────────── Paystack ─────────────
// Docs: https://paystack.com/docs/payments/accept-payments/

const PAYSTACK_API = "https://api.paystack.co";

const paystackProvider: PaymentProvider = {
  name: "paystack",
  label: "Paystack",
  currencies: ["NGN", "GHS", "ZAR", "KES"],
  async initialize(i) {
    const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: i.reference,
        amount: i.amount,
        currency: i.currency,
        email: i.email,
        callback_url: i.successUrl,
        metadata: { ...i.metadata, cancel_action: i.cancelUrl },
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: { authorization_url: string } } | null;
    if (!res.ok || !json?.status || !json.data?.authorization_url) throw new Error(`Paystack initialize failed: ${json?.message ?? res.status}`);
    return { authorizationUrl: json.data.authorization_url };
  },
  async verify(reference) {
    const res = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as {
      status?: boolean;
      message?: string;
      data?: { status: string; amount: number; currency: string; channel?: string; gateway_response?: string; paid_at?: string };
    } | null;
    if (!res.ok || !json?.status || !json.data) throw new Error(`Paystack verify failed: ${json?.message ?? res.status}`);
    const d = json.data;
    return {
      status: d.status === "success" ? "success" : d.status === "failed" ? "failed" : d.status === "abandoned" ? "abandoned" : "pending",
      amount: d.amount,
      currency: d.currency,
      channel: d.channel,
      gatewayResponse: d.gateway_response,
      paidAt: d.paid_at ? new Date(d.paid_at) : undefined,
      raw: d,
    };
  },
};

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

// ───────────── Test payments (development only) ─────────────

const testProvider: PaymentProvider = {
  name: "test",
  label: "Test payment",
  currencies: "any",
  async initialize({ reference }) {
    return { authorizationUrl: `/checkout/test-payment?reference=${encodeURIComponent(reference)}` };
  },
  async verify(reference) {
    const payment = await db.payment.findUnique({ where: { reference } });
    const outcome = (payment?.raw as { testOutcome?: string } | null)?.testOutcome;
    return {
      status: outcome === "success" ? "success" : outcome === "failed" ? "failed" : outcome === "cancelled" ? "abandoned" : "pending",
      amount: payment?.amount ?? 0,
      currency: payment?.currency ?? "CAD",
      channel: "test",
      gatewayResponse: outcome ? `Test ${outcome}` : "Awaiting test outcome",
      paidAt: outcome === "success" ? new Date() : undefined,
      raw: { testOutcome: outcome ?? null },
    };
  },
};

export function testPaymentsAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_PAYMENTS === "true";
}

function configured(name: ProviderName) {
  if (name === "stripe") return Boolean(process.env.STRIPE_SECRET_KEY);
  if (name === "paystack") return Boolean(process.env.PAYSTACK_SECRET_KEY);
  return testPaymentsAllowed() && process.env.PAYMENT_TEST_MODE === "true";
}

const ALL: Record<ProviderName, PaymentProvider> = { stripe: stripeProvider, paystack: paystackProvider, test: testProvider };

export function getProviderByName(name: string): PaymentProvider | null {
  const p = ALL[name as ProviderName];
  if (!p) return null;
  if (name === "test") return testPaymentsAllowed() ? p : null;
  return configured(p.name) ? p : null;
}

function supports(p: PaymentProvider, currency: string) {
  return p.currencies === "any" || p.currencies.includes(currency);
}

/**
 * Choose who processes a payment in this currency. Naira goes to Paystack,
 * everything else to Stripe. In test mode the local simulator handles all.
 */
export function providerForCurrency(currency: string): PaymentProvider | null {
  if (configured("test")) return testProvider;
  const order: ProviderName[] = currency === "NGN" ? ["paystack", "stripe"] : ["stripe", "paystack"];
  for (const n of order) if (configured(n) && supports(ALL[n], currency)) return ALL[n];
  return null;
}

/** Safe-to-display status for the admin settings page. Never returns secrets. */
export function paymentStatusSummary() {
  const mode = (key: string | undefined, live: string, test: string) =>
    !key ? "Not connected" : key.startsWith(live) ? "Live" : key.startsWith(test) ? "Test mode" : "Connected";
  return {
    stripe: {
      connected: configured("stripe"),
      mode: mode(process.env.STRIPE_SECRET_KEY, "sk_live_", "sk_test_"),
      webhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    },
    paystack: {
      connected: configured("paystack"),
      mode: mode(process.env.PAYSTACK_SECRET_KEY, "sk_live_", "sk_test_"),
    },
    testMode: configured("test"),
  };
}
