import { NextResponse } from "next/server";
import { verifyPaystackSignature } from "@/lib/payments";
import { confirmPayment } from "@/lib/orders";

// Paystack → POST /api/webhooks/paystack
// Set this URL as the Webhook URL in Paystack → Settings → API Keys & Webhooks.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyPaystackSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let body: { event?: string; data?: { reference?: string } };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }
  const reference = body.data?.reference;
  if (reference && (body.event === "charge.success" || body.event === "charge.failed")) {
    try {
      // Re-verifies with Paystack's API before marking anything paid.
      await confirmPayment(reference);
    } catch (err) {
      console.error("[webhook:paystack]", err);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
