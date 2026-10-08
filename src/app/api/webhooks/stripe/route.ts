import { NextResponse } from "next/server";
import { stripeWebhookEvent } from "@/lib/payments";
import { confirmPayment } from "@/lib/orders";

// Stripe → POST /api/webhooks/stripe
// Events to enable in the Stripe dashboard: checkout.session.completed,
// checkout.session.async_payment_succeeded, checkout.session.async_payment_failed,
// checkout.session.expired.
export async function POST(req: Request) {
  const raw = await req.text();
  const event = stripeWebhookEvent(raw, req.headers.get("stripe-signature"));
  if (!event) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  if (event.type.startsWith("checkout.session.")) {
    const session = event.data.object as { client_reference_id?: string | null; metadata?: Record<string, string> | null };
    const reference = session.metadata?.reference || session.client_reference_id;
    if (reference) {
      try {
        // confirmPayment re-fetches the session from Stripe's API; the webhook body itself is never trusted for amounts.
        await confirmPayment(reference);
      } catch (err) {
        console.error("[webhook:stripe]", err);
        return NextResponse.json({ error: "Processing failed" }, { status: 500 }); // Stripe will retry
      }
    }
  }
  return NextResponse.json({ received: true });
}
