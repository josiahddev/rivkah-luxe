import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/utils";
import { countryName } from "@/lib/regions";
import { ORDER_STATUS_LABEL, STATUS_TONE } from "@/lib/order-status";
import { Card, PageHeader, Pill, StatCard } from "@/components/admin/ui";
import { ConfirmAction } from "@/components/admin/client-ui";
import { setCustomerStatus } from "@/server/admin/orders";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  await requireAdmin("customers");
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id }, include: { addresses: true, _count: { select: { wishlist: true, reviews: true } } } });
  if (!u) notFound();
  const [orders, settings, sub] = await Promise.all([
    db.order.findMany({ where: { OR: [{ userId: u.id }, { email: u.email }] }, orderBy: { createdAt: "desc" } }),
    getSettings(),
    db.newsletterSubscriber.findUnique({ where: { email: u.email } }),
  ]);
  const paid = orders.filter((o) => o.paymentStatus === "PAID");
  const spent = paid.reduce((s, o) => s + o.baseTotal, 0);
  return (
    <>
      <PageHeader
        title={u.name}
        description={`${u.email}${u.phone ? ` · ${u.phone}` : ""} · customer since ${formatDate(u.createdAt)}`}
        back={{ href: "/admin/customers", label: "Customers" }}
        actions={
          u.role === "CUSTOMER" &&
          (u.status === "ACTIVE" ? (
            <ConfirmAction action={setCustomerStatus.bind(null, u.id, "SUSPENDED")} label="Suspend account" variant="outline" className="rounded-md" title="Suspend this account?" message="They'll be signed out and won't be able to sign in. Their orders are kept." confirmLabel="Suspend" />
          ) : (
            <ConfirmAction action={setCustomerStatus.bind(null, u.id, "ACTIVE")} label="Re-activate account" variant="primary" className="rounded-md" title="Re-activate this account?" message="They'll be able to sign in again." confirmLabel="Re-activate" />
          ))
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Orders" value={paid.length} />
        <StatCard label="Total spent" value={formatMoney(spent, settings.currency)} />
        <StatCard label="Average order" value={formatMoney(paid.length ? Math.round(spent / paid.length) : 0, settings.currency)} />
        <StatCard label="Newsletter" value={sub?.status === "SUBSCRIBED" ? "Yes" : "No"} sub={`${u._count.wishlist} saved items · ${u._count.reviews} reviews`} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card title="Order history">
          {orders.length === 0 ? <p className="text-sm text-stone">No orders yet.</p> : (
            <ul className="-my-2 divide-y divide-line">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-3 py-3 text-sm hover:opacity-80">
                    <span className="font-medium">{o.orderNumber}</span>
                    <span className="flex-1 text-stone">{formatDateTime(o.createdAt)}</span>
                    <Pill tone={STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Pill>
                    <span className="tabular-nums">{formatMoney(o.total, o.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Saved addresses">
          {u.addresses.length === 0 ? <p className="text-sm text-stone">None saved.</p> : (
            <ul className="space-y-4 text-sm">
              {u.addresses.map((a) => (
                <li key={a.id}>{a.fullName}{a.isDefault && <span className="ml-2 text-xs text-gold-deep">Default</span>}<br /><span className="text-stone">{a.line1}, {a.city}, {a.state} {a.postalCode}, {countryName(a.country)}</span></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
