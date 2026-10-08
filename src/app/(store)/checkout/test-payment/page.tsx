import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { testPaymentsAllowed } from "@/lib/payments";
import { formatMoney } from "@/lib/money";
import { TestPaymentPanel } from "@/components/store/payment-status";

export const metadata = { title: "Test payment", robots: { index: false } };

export default async function TestPaymentPage({ searchParams }: PageProps<"/checkout/test-payment">) {
  if (!testPaymentsAllowed()) notFound();
  const sp = await searchParams;
  const reference = typeof sp.reference === "string" ? sp.reference : "";
  const payment = await db.payment.findUnique({ where: { reference } });
  if (!payment || payment.provider !== "test") notFound();
  return (
    <div className="container-luxe py-20">
      <TestPaymentPanel reference={reference} amount={formatMoney(payment.amount, payment.currency)} />
    </div>
  );
}
