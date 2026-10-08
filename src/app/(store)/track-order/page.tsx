import type { Metadata } from "next";
import Image from "next/image";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { countryName } from "@/lib/regions";
import { deliveryStatus, PAYMENT_STATUS_LABEL } from "@/lib/order-status";
import { rateLimit } from "@/lib/rate-limit";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form";
import { OrderTimeline } from "@/components/store/order-timeline";

export const metadata: Metadata = { title: "Track your order", description: "Check the status of your Rivkah Luxe order." };

export default async function TrackOrderPage({ searchParams }: PageProps<"/track-order">) {
  const sp = await searchParams;
  const orderNumber = (typeof sp.order === "string" ? sp.order : "").trim().toUpperCase().slice(0, 20);
  const email = (typeof sp.email === "string" ? sp.email : "").trim().toLowerCase().slice(0, 200);
  let error: string | null = null;
  let order = null;
  if (orderNumber && email) {
    if (!(await rateLimit("track", 20, 600))) error = "Too many lookups. Please try again in a few minutes.";
    else {
      order = await db.order.findFirst({
        where: { orderNumber, email },
        include: { items: true, history: { orderBy: { createdAt: "asc" } } },
      });
      if (!order) error = "We couldn't find an order with that number and email. Please check both and try again.";
    }
  }

  return (
    <div className="container-luxe py-14 sm:py-20">
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow mb-3 text-gold-deep">Order status</p>
        <h1 className="font-display text-5xl">Track your order</h1>
        <p className="mt-4 text-stone">Enter the order number from your confirmation email and the email you used at checkout.</p>
      </div>

      <form method="get" className="mx-auto mt-10 grid max-w-xl gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block space-y-1.5 text-left">
          <span className="text-[0.78rem] font-medium text-charcoal">Order number</span>
          <input name="order" defaultValue={orderNumber} required placeholder="RL10012" className="h-12 w-full border border-line bg-white px-4 uppercase focus:border-ink focus:outline-none" />
        </label>
        <label className="block space-y-1.5 text-left">
          <span className="text-[0.78rem] font-medium text-charcoal">Email</span>
          <input name="email" type="email" defaultValue={email} required className="h-12 w-full border border-line bg-white px-4 focus:border-ink focus:outline-none" />
        </label>
        <Button type="submit">Track</Button>
      </form>
      <div className="mx-auto mt-6 max-w-xl"><FormError message={error} /></div>

      {order && (
        <div className="mx-auto mt-14 grid max-w-4xl gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-3xl">Order {order.orderNumber}</h2>
              <p className="text-sm text-stone">Placed {formatDate(order.createdAt)}</p>
            </div>
            <OrderTimeline status={order.status} history={order.history} />
          </div>
          <aside className="h-fit space-y-5 border border-line bg-cream p-6 text-sm">
            <div><p className="eyebrow text-stone">Payment</p><p className="mt-1">{PAYMENT_STATUS_LABEL[order.paymentStatus]}</p></div>
            <div><p className="eyebrow text-stone">Delivery</p><p className="mt-1">{deliveryStatus(order.status)}{order.deliveryEstimate ? ` · ${order.deliveryEstimate}` : ""}</p></div>
            <div><p className="eyebrow text-stone">Shipping to</p><p className="mt-1">{order.city}, {order.state}, {countryName(order.country)}</p></div>
            <ul className="space-y-3 border-t border-line pt-4">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3">
                  <div className="relative h-12 w-10 shrink-0 bg-sand">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="40px" className="object-cover" />}</div>
                  <span className="flex-1">{i.productName}{i.variantName ? ` · ${i.variantName}` : ""} × {i.quantity}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-line pt-4 text-base"><span>Total</span><span>{formatMoney(order.total, order.currency)}</span></div>
          </aside>
        </div>
      )}
    </div>
  );
}
