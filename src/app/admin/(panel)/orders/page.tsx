import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { formatMoney, toMinor } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, STATUS_TONE } from "@/lib/order-status";
import { AdminEmpty, FilterBar, FilterField, filterInput, PageHeader, Pager, Pill, td, th } from "@/components/admin/ui";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Orders" };
const PER_PAGE = 30;

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin("orders");
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const q = get("q"), status = get("status"), payment = get("payment"), from = get("from"), to = get("to"), min = get("min"), max = get("max");
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.OrderWhereInput = {
    ...(q ? { OR: [{ orderNumber: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
    ...(status === "open" ? { status: { in: ["PAYMENT_CONFIRMED", "PROCESSING", "READY_FOR_DELIVERY"] } } : status ? { status: status as OrderStatus } : {}),
    ...(payment ? { paymentStatus: payment as PaymentStatus } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}) } } : {}),
    ...(min || max ? { baseTotal: { ...(min ? { gte: toMinor(min) } : {}), ...(max ? { lte: toMinor(max) } : {}) } } : {}),
  };
  const [orders, total, counts] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { _count: { select: { items: true } } } }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: OrderStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  const open = count("PAYMENT_CONFIRMED") + count("PROCESSING") + count("READY_FOR_DELIVERY");
  const tabs = [
    { label: "All", value: "" },
    { label: `To pack (${open})`, value: "open" },
    { label: "Shipped", value: "SHIPPED" },
    { label: "Delivered", value: "DELIVERED" },
    { label: "Awaiting payment", value: "PENDING" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  return (
    <>
      <PageHeader title="Orders" description="Click an order to see the customer's details and update its progress. Customers are emailed when you change the status." />
      <nav className="no-scrollbar -mx-4 mb-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Order status">
        {tabs.map((t) => (
          <Link key={t.label} href={t.value ? `?status=${t.value}` : "?"} aria-current={status === t.value ? "page" : undefined} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${status === t.value ? "bg-ink text-ivory" : "border border-line bg-white hover:border-ink"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      <FilterBar>
        <input type="hidden" name="status" value={status} />
        <FilterField label="Search"><input name="q" defaultValue={q} placeholder="Order #, name, email, phone" className={filterInput} /></FilterField>
        <FilterField label="Payment">
          <select name="payment" defaultValue={payment} className={filterInput}>
            <option value="">Any</option>
            {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </FilterField>
        <FilterField label="From"><input type="date" name="from" defaultValue={from} className={filterInput} /></FilterField>
        <FilterField label="To"><input type="date" name="to" defaultValue={to} className={filterInput} /></FilterField>
        <FilterField label="Min total (CAD)"><input name="min" defaultValue={min} inputMode="decimal" className={`${filterInput} w-28`} /></FilterField>
        <FilterField label="Max total (CAD)"><input name="max" defaultValue={max} inputMode="decimal" className={`${filterInput} w-28`} /></FilterField>
        <button className="h-10 rounded-md bg-ink px-5 text-sm font-medium text-ivory">Filter</button>
        {(q || payment || from || to || min || max) && <Link href={status ? `?status=${status}` : "?"} className="h-10 px-2 text-sm leading-10 text-stone underline">Clear</Link>}
      </FilterBar>

      {orders.length === 0 ? (
        <AdminEmpty title="No orders here." message={q || payment || from ? "Try changing the filters." : "When customers pay, their orders appear here instantly."} />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr><th className={th}>Order</th><th className={th}>Date</th><th className={th}>Customer</th><th className={th}>Payment</th><th className={th}>Status</th><th className={`${th} text-right`}>Total</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-cream/40">
                    <td className={td}>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.orderNumber}</Link>
                      {o.needsAttention && <span className="ml-2 text-xs text-danger" title={o.needsAttention}>⚠ Check</span>}
                      {o.isDemo && <span className="ml-2 text-xs text-gold-deep">demo</span>}
                    </td>
                    <td className={`${td} text-stone`}>{formatDateTime(o.createdAt)}</td>
                    <td className={td}>{o.customerName}<span className="block text-xs text-stone">{o.city}, {o.country}</span></td>
                    <td className={td}><Pill tone={o.paymentStatus === "PAID" ? "green" : o.paymentStatus === "FAILED" ? "red" : "neutral"}>{PAYMENT_STATUS_LABEL[o.paymentStatus]}</Pill></td>
                    <td className={td}><Pill tone={STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Pill></td>
                    <td className={`${td} text-right tabular-nums`}>{formatMoney(o.total, o.currency)}<span className="block text-xs text-stone">{o._count.items} item{o._count.items > 1 ? "s" : ""}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="block rounded-lg border border-line bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{o.orderNumber}{o.needsAttention && <span className="ml-2 text-xs text-danger">⚠</span>}</span>
                    <span className="tabular-nums">{formatMoney(o.total, o.currency)}</span>
                  </div>
                  <p className="mt-1 text-sm text-stone">{o.customerName} · {formatDateTime(o.createdAt)}</p>
                  <div className="mt-2 flex gap-2">
                    <Pill tone={STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Pill>
                    {o.paymentStatus !== "PAID" && <Pill tone={o.paymentStatus === "FAILED" ? "red" : "neutral"}>{PAYMENT_STATUS_LABEL[o.paymentStatus]}</Pill>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <Pager page={page} pages={Math.ceil(total / PER_PAGE)} params={{ q, status, payment, from, to, min, max }} />
    </>
  );
}
