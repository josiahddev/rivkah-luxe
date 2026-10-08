import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { confirmPayment } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/bits";
import { AlertIcon } from "@/components/ui/icons";
import { PaymentPending, RetryPayment } from "@/components/store/payment-status";
import { WhatsAppInline } from "@/components/store/whatsapp-button";

export const metadata: Metadata = { title: "Confirming payment", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Customers land here after paying. We never trust the redirect itself — the
 * payment is verified with the provider's API on the server before anything
 * is marked as paid.
 */
export default async function VerifyPage({ searchParams }: PageProps<"/checkout/verify">) {
  const sp = await searchParams;
  const reference = typeof sp.reference === "string" ? sp.reference.slice(0, 80) : "";
  if (!reference) redirect("/cart");

  const result = await confirmPayment(reference);
  if (result.outcome === "paid" || result.outcome === "already-paid") {
    redirect(`/checkout/success?reference=${encodeURIComponent(reference)}`);
  }

  const settings = await getSettings();
  const payment = await db.payment.findUnique({ where: { reference }, include: { order: { select: { orderNumber: true, email: true } } } });

  if (result.outcome === "pending") {
    return (
      <div className="container-luxe py-20">
        <PaymentPending reference={reference} cancelled={sp.cancelled === "1"} orderNumber={payment?.order.orderNumber} email={payment?.order.email} />
      </div>
    );
  }

  if (result.outcome === "failed" || result.outcome === "cancelled") {
    return (
      <div className="container-luxe py-20">
        <EmptyState
          icon={<AlertIcon size={26} />}
          title={result.outcome === "cancelled" ? "Payment cancelled." : "Your payment didn't go through."}
          message={
            result.outcome === "cancelled"
              ? "No money was taken. Your order is saved — you can try again whenever you're ready."
              : "No money was taken. Please try again, or use a different card or payment method."
          }
        >
          {payment && <RetryPayment orderNumber={payment.order.orderNumber} email={payment.order.email} />}
          <ButtonLink href="/cart" variant="outline">Back to bag</ButtonLink>
        </EmptyState>
        {settings.whatsapp && (
          <p className="text-center">
            <WhatsAppInline number={settings.whatsapp} message={`Hello, I need help paying for order ${payment?.order.orderNumber ?? ""}.`} label="Need help? Chat with us on WhatsApp" />
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="container-luxe py-20">
      <EmptyState
        icon={<AlertIcon size={26} />}
        title={result.outcome === "mismatch" ? "We need to check your payment." : "We couldn't find that payment."}
        message={
          result.outcome === "mismatch"
            ? "Thank you — we've received a payment but need to confirm a detail before we confirm your order. We'll be in touch shortly."
            : "Something went wrong. If money left your account, please contact us with your payment reference and we'll sort it out."
        }
      >
        <ButtonLink href="/contact">Contact us</ButtonLink>
      </EmptyState>
      <p className="text-center text-xs text-stone">Reference: {reference}</p>
    </div>
  );
}
