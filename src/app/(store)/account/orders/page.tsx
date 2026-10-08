import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABEL, STATUS_TONE } from "@/lib/order-status";
import { Badge } from "@/components/ui/bits";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await db.order.findMany({
    where: { OR: [{ userId: user.id }, { email: user.email }] },
    orderBy: { createdAt: "desc" },
    include: { items: { take: 3 } },
  });
  if (!orders.length)
    return (
      <div className="border border-line bg-white p-10 text-center">
        <p className="font-display text-3xl">No orders yet.</p>
        <p className="mt-2 text-stone">Your bag is waiting for something beautiful.</p>
        <ButtonLink href="/shop" className="mt-6">Shop the collection</ButtonLink>
      </div>
    );
  return (
    <div>
      <h2 className="mb-6 font-display text-3xl">Orders</h2>
      <ul className="space-y-4">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/account/orders/${o.orderNumber}`} className="block border border-line bg-white p-5 transition-colors hover:border-ink">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{o.orderNumber}</p>
                  <p className="text-xs text-stone">{formatDate(o.createdAt)}</p>
                </div>
                <Badge tone={o.paymentStatus === "PENDING" || o.paymentStatus === "FAILED" ? "neutral" : STATUS_TONE[o.status]}>
                  {o.paymentStatus === "FAILED" ? "Payment failed" : ORDER_STATUS_LABEL[o.status]}
                </Badge>
                <p className="tabular-nums">{formatMoney(o.total, o.currency)}</p>
              </div>
              <div className="mt-4 flex gap-2">
                {o.items.map((i) => (
                  <div key={i.id} className="relative h-14 w-11 bg-sand">{i.imageUrl && <Image src={i.imageUrl} alt={i.productName} fill sizes="44px" className="object-cover" />}</div>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
