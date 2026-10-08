import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { countryName } from "@/lib/regions";
import { deliveryStatus, PAYMENT_STATUS_LABEL } from "@/lib/order-status";
import { OrderTimeline } from "@/components/store/order-timeline";
import { RetryPayment } from "@/components/store/payment-status";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

export default async function OrderDetailPage({ params }: PageProps<"/account/orders/[number]">) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}`);
  const o = await db.order.findFirst({
    where: { orderNumber: number, OR: [{ userId: user.id }, { email: user.email }] },
    include: { items: { include: { product: { select: { slug: true } } } }, history: { orderBy: { createdAt: "asc" } } },
  });
  if (!o) notFound();
  const m = (n: number) => formatMoney(n, o.currency);
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Link href="/account/orders" className="text-sm text-stone hover:text-ink">← All orders</Link>
          <h2 className="mt-2 font-display text-4xl">Order {o.orderNumber}</h2>
          <p className="text-sm text-stone">Placed {formatDate(o.createdAt)} · {PAYMENT_STATUS_LABEL[o.paymentStatus]} · {deliveryStatus(o.status)}</p>
        </div>
        {(o.paymentStatus === "FAILED" || o.paymentStatus === "CANCELLED" || o.paymentStatus === "PENDING") && o.status !== "CANCELLED" && (
          <RetryPayment orderNumber={o.orderNumber} email={o.email} />
        )}
      </div>
      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <div>
          <OrderTimeline status={o.status} history={o.history} />
          <ul className="mt-10 divide-y divide-line border-y border-line">
            {o.items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 py-4">
                <div className="relative h-20 w-16 shrink-0 bg-sand">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="64px" className="object-cover" />}</div>
                <div className="flex-1">
                  {i.product ? <Link href={`/products/${i.product.slug}`} className="font-display text-lg hover:text-gold-deep">{i.productName}</Link> : <p className="font-display text-lg">{i.productName}</p>}
                  <p className="text-xs text-stone">{i.variantName ? `${i.variantName} · ` : ""}{m(i.unitPrice)} × {i.quantity}</p>
                  {o.status === "DELIVERED" && i.product && (
                    <Link href={`/products/${i.product.slug}#reviews`} className="mt-1 inline-block text-xs text-gold-deep underline underline-offset-4">Write a review</Link>
                  )}
                </div>
                <p className="tabular-nums">{m(i.lineTotal)}</p>
              </li>
            ))}
          </ul>
        </div>
        <aside className="h-fit space-y-5 border border-line bg-cream p-6 text-sm">
          <dl className="space-y-2">
            <div className="flex justify-between"><dt className="text-stone">Subtotal</dt><dd>{m(o.subtotal)}</dd></div>
            {o.discountTotal > 0 && <div className="flex justify-between text-gold-deep"><dt>Discount</dt><dd>−{m(o.discountTotal)}</dd></div>}
            <div className="flex justify-between"><dt className="text-stone">Shipping</dt><dd>{o.shippingFee ? m(o.shippingFee) : "Free"}</dd></div>
            {o.taxTotal > 0 && <div className="flex justify-between"><dt className="text-stone">Sales tax</dt><dd>{m(o.taxTotal)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-3 text-base"><dt>Total</dt><dd>{m(o.total)}</dd></div>
          </dl>
          <div className="border-t border-line pt-4">
            <p className="eyebrow mb-2 text-stone">Shipping to</p>
            <p className="leading-relaxed">{o.customerName}<br />{o.addressLine1}{o.addressLine2 ? `, ${o.addressLine2}` : ""}<br />{o.city}, {o.state} {o.postalCode}<br />{countryName(o.country)}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
