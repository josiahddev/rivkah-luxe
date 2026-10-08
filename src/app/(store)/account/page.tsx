import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABEL, STATUS_TONE } from "@/lib/order-status";
import { Badge } from "@/components/ui/bits";
import { ButtonLink } from "@/components/ui/button";
import { FormSuccess } from "@/components/ui/form";
import { NewsletterToggle } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const user = await requireUser();
  const sp = await searchParams;
  const [orders, wishCount, addressCount, sub] = await Promise.all([
    db.order.findMany({ where: { OR: [{ userId: user.id }, { email: user.email }], NOT: { paymentStatus: "PENDING", status: "PENDING" } }, orderBy: { createdAt: "desc" }, take: 3 }),
    db.wishlistItem.count({ where: { userId: user.id } }),
    db.address.count({ where: { userId: user.id } }),
    db.newsletterSubscriber.findUnique({ where: { email: user.email } }),
  ]);
  return (
    <div className="space-y-12">
      {sp.reset === "1" && <FormSuccess message="Your password has been updated." />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Orders" value={orders.length ? "View all" : "0"} href="/account/orders" />
        <Stat label="Saved items" value={String(wishCount)} href="/wishlist" />
        <Stat label="Addresses" value={String(addressCount)} href="/account/addresses" />
      </div>

      <section>
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="font-display text-3xl">Recent orders</h2>
          <Link href="/account/orders" className="text-sm text-stone underline underline-offset-4 hover:text-ink">All orders</Link>
        </div>
        {orders.length === 0 ? (
          <div className="border border-line bg-white p-8 text-center">
            <p className="font-display text-2xl">No orders yet.</p>
            <p className="mt-2 text-sm text-stone">When you place an order, you&apos;ll be able to follow it here.</p>
            <ButtonLink href="/shop" className="mt-6">Start shopping</ButtonLink>
          </div>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.orderNumber}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-cream/60">
                  <span className="font-medium">{o.orderNumber}</span>
                  <span className="text-sm text-stone">{formatDate(o.createdAt)}</span>
                  <Badge tone={STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                  <span className="tabular-nums">{formatMoney(o.total, o.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-line bg-white p-6">
        <h2 className="font-display text-2xl">Email preferences</h2>
        <p className="mt-2 text-sm text-stone">Hear about new arrivals, restocks and offers. You&apos;ll always receive order emails.</p>
        <div className="mt-4">
          <NewsletterToggle subscribed={sub?.status === "SUBSCRIBED"} />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="border border-line bg-white p-5 transition-colors hover:border-ink">
      <p className="eyebrow text-stone">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </Link>
  );
}
