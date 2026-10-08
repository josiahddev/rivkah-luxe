import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { countryName } from "@/lib/regions";
import { getCurrentUser } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default async function SuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  const sp = await searchParams;
  const reference = typeof sp.reference === "string" ? sp.reference : "";
  const payment = reference
    ? await db.payment.findUnique({ where: { reference }, include: { order: { include: { items: true } } } })
    : null;
  if (!payment || payment.order.paymentStatus !== "PAID") notFound();
  const o = payment.order;
  const user = await getCurrentUser();
  const m = (n: number) => formatMoney(n, o.currency);

  return (
    <div className="container-luxe py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center animate-fade-up">
        <div className="mx-auto mb-8 grid size-16 place-items-center rounded-full bg-ink text-champagne">
          <CheckIcon size={28} />
        </div>
        <p className="eyebrow text-gold-deep">Order confirmed</p>
        <h1 className="mt-3 font-display text-5xl leading-tight sm:text-6xl">Thank you, {o.customerName.split(" ")[0]}.</h1>
        <p className="mt-5 text-stone">
          Your order <strong className="text-ink">{o.orderNumber}</strong> is confirmed and a receipt is on its way to <strong className="text-ink">{o.email}</strong>.
          We&apos;ll email you again when it ships.
        </p>
      </div>

      <div className="mx-auto mt-14 max-w-2xl border border-line bg-white">
        <div className="grid gap-4 border-b border-line p-6 text-sm sm:grid-cols-3">
          <div><p className="eyebrow text-stone">Order</p><p className="mt-1">{o.orderNumber}</p></div>
          <div><p className="eyebrow text-stone">Date</p><p className="mt-1">{formatDate(o.createdAt)}</p></div>
          <div><p className="eyebrow text-stone">Payment</p><p className="mt-1 text-success">Paid · {payment.provider === "paystack" ? "Paystack" : payment.provider === "stripe" ? "Card" : "Test"}</p></div>
        </div>
        <ul className="divide-y divide-line px-6">
          {o.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-4">
              <div className="relative h-16 w-13 shrink-0 bg-sand">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="52px" className="object-cover" />}</div>
              <div className="flex-1 text-sm">
                <p className="font-display text-lg leading-snug">{i.productName}</p>
                <p className="text-xs text-stone">{i.variantName ? `${i.variantName} · ` : ""}Qty {i.quantity}</p>
              </div>
              <p className="text-sm tabular-nums">{m(i.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-line p-6 text-sm">
          <div className="flex justify-between"><dt className="text-stone">Subtotal</dt><dd>{m(o.subtotal)}</dd></div>
          {o.discountTotal > 0 && <div className="flex justify-between text-gold-deep"><dt>Discount</dt><dd>−{m(o.discountTotal)}</dd></div>}
          <div className="flex justify-between"><dt className="text-stone">Shipping</dt><dd>{o.shippingFee ? m(o.shippingFee) : "Free"}</dd></div>
          {o.taxTotal > 0 && <div className="flex justify-between"><dt className="text-stone">Sales tax</dt><dd>{m(o.taxTotal)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-3 text-base"><dt>Total</dt><dd className="tabular-nums">{m(o.total)}</dd></div>
        </dl>
        <div className="border-t border-line p-6 text-sm text-stone">
          <p className="eyebrow mb-2 text-charcoal">Shipping to</p>
          {o.customerName}, {o.addressLine1}{o.addressLine2 ? `, ${o.addressLine2}` : ""}, {o.city}, {o.state} {o.postalCode ?? ""}, {countryName(o.country)}
          {o.deliveryEstimate && <p className="mt-2">Estimated delivery: {o.deliveryEstimate} after dispatch.</p>}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <ButtonLink href={`/track-order?order=${o.orderNumber}&email=${encodeURIComponent(o.email)}`}>Track your order</ButtonLink>
        {user ? <ButtonLink href="/account/orders" variant="outline">View my orders</ButtonLink> : <ButtonLink href="/register" variant="outline">Create an account</ButtonLink>}
        <ButtonLink href="/shop" variant="ghost">Continue shopping</ButtonLink>
      </div>
    </div>
  );
}
