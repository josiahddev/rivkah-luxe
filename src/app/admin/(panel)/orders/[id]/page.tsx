import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { countryName } from "@/lib/regions";
import { whatsappLink } from "@/lib/whatsapp";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, STATUS_TONE } from "@/lib/order-status";
import { Card, PageHeader, Pill } from "@/components/admin/ui";
import { OrderNoteForm, OrderStatusForm, ResolveAttention } from "@/components/admin/order-forms";
import { PrinterIcon, WhatsAppIcon } from "@/components/ui/icons";

export const metadata = { title: "Order" };

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin("orders");
  const { id } = await params;
  const o = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      history: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      user: { select: { id: true } },
    },
  });
  if (!o) notFound();
  const previous = await db.order.count({ where: { email: o.email, paymentStatus: "PAID", NOT: { id: o.id } } });
  const m = (n: number) => formatMoney(n, o.currency);

  return (
    <>
      <PageHeader
        title={`Order ${o.orderNumber}`}
        description={<>Placed {formatDateTime(o.createdAt)} · <Pill tone={STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Pill> <Pill tone={o.paymentStatus === "PAID" ? "green" : o.paymentStatus === "FAILED" ? "red" : "neutral"}>{PAYMENT_STATUS_LABEL[o.paymentStatus]}</Pill></>}
        back={{ href: "/admin/orders", label: "Orders" }}
        actions={
          <Link href={`/admin/invoice/${o.id}`} target="_blank" className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm hover:border-ink">
            <PrinterIcon size={17} /> Print invoice
          </Link>
        }
      />

      {o.needsAttention && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/40 bg-danger-soft p-4 text-sm text-danger">
          <span><strong>Needs your attention:</strong> {o.needsAttention}</span>
          <ResolveAttention orderId={o.id} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title="Update progress" description="Choose what's happening now. The customer can follow it on the tracking page.">
            <OrderStatusForm orderId={o.id} current={o.status} paid={o.paymentStatus === "PAID"} />
          </Card>

          <Card title={`Items (${o.items.reduce((s, i) => s + i.quantity, 0)})`}>
            <ul className="-my-3 divide-y divide-line">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 py-3">
                  <div className="relative h-16 w-13 shrink-0 overflow-hidden rounded bg-sand">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="52px" className="object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    {i.productId ? <Link href={`/admin/products/${i.productId}`} className="font-medium hover:underline">{i.productName}</Link> : <p className="font-medium">{i.productName}</p>}
                    <p className="text-xs text-stone">{i.variantName ? `${i.variantName} · ` : ""}SKU {i.sku}</p>
                  </div>
                  <p className="text-sm text-stone">{m(i.unitPrice)} × {i.quantity}</p>
                  <p className="w-24 text-right tabular-nums">{m(i.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-stone">Subtotal</dt><dd>{m(o.subtotal)}</dd></div>
              {o.discountTotal > 0 && <div className="flex justify-between"><dt className="text-stone">Discount {o.couponCode && `(${o.couponCode})`}</dt><dd>−{m(o.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt className="text-stone">Shipping · {o.shippingZoneName}</dt><dd>{o.shippingFee ? m(o.shippingFee) : "Free"}</dd></div>
              {o.taxTotal > 0 && <div className="flex justify-between"><dt className="text-stone">Sales tax</dt><dd>{m(o.taxTotal)}</dd></div>}
              <div className="flex justify-between pt-2 text-base font-medium"><dt>Total</dt><dd>{m(o.total)}</dd></div>
              {o.currency !== o.baseCurrency && <div className="flex justify-between text-xs text-stone"><dt>In {o.baseCurrency} (for your reports)</dt><dd>≈ {formatMoney(o.baseTotal, o.baseCurrency)}</dd></div>}
            </dl>
          </Card>

          <Card title="Internal notes" description="Only your team can see these.">
            <OrderNoteForm orderId={o.id} />
            {o.notes.length > 0 && (
              <ul className="mt-5 space-y-3">
                {o.notes.map((n) => (
                  <li key={n.id} className="rounded-md bg-cream/60 p-3 text-sm">
                    <p className="whitespace-pre-line">{n.body}</p>
                    <p className="mt-1 text-xs text-stone">{n.author?.name ?? "Team"} · {formatDateTime(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Order history">
            <ol className="space-y-3 text-sm">
              {o.history.map((h) => (
                <li key={h.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" />
                  <div>
                    <p><strong className="font-medium">{ORDER_STATUS_LABEL[h.status]}</strong>{h.byName && <span className="text-stone"> by {h.byName}</span>}</p>
                    {h.note && <p className="text-stone">{h.note}</p>}
                    <p className="text-xs text-stone">{formatDateTime(h.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Customer">
            <div className="space-y-1 text-sm">
              <p className="font-medium">{o.customerName}</p>
              <p><a href={`mailto:${o.email}`} className="hover:underline">{o.email}</a></p>
              <p><a href={`tel:${o.phone.replace(/\s/g, "")}`} className="hover:underline">{o.phone}</a></p>
              <p className="pt-1 text-stone">{previous ? `${previous} previous order${previous > 1 ? "s" : ""}` : "First order"}</p>
              <div className="flex flex-wrap gap-3 pt-3">
                <a href={whatsappLink(o.phone, `Hello ${o.customerName.split(" ")[0]}, this is ${"Rivkah Luxe"} about your order ${o.orderNumber}.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs hover:border-ink">
                  <WhatsAppIcon size={15} className="text-[#1f9e55]" /> WhatsApp
                </a>
                {o.user && <Link href={`/admin/customers/${o.user.id}`} className="rounded-md border border-line px-3 py-2 text-xs hover:border-ink">View profile</Link>}
              </div>
            </div>
          </Card>
          <Card title="Ship to">
            <address className="text-sm not-italic leading-relaxed">
              {o.customerName}<br />{o.addressLine1}{o.addressLine2 && <><br />{o.addressLine2}</>}<br />{o.city}, {o.state} {o.postalCode}<br />{countryName(o.country)}
            </address>
            {o.deliveryEstimate && <p className="mt-3 text-xs text-stone">Promised: {o.deliveryEstimate}</p>}
            {o.deliveryInstructions && <p className="mt-3 rounded-md bg-champagne/20 p-3 text-sm"><strong className="font-medium">Customer note:</strong> {o.deliveryInstructions}</p>}
          </Card>
          <Card title="Payment">
            {o.payments.length === 0 ? (
              <p className="text-sm text-stone">No payment attempts yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {o.payments.map((p) => (
                  <li key={p.id} className="rounded-md border border-line p-3">
                    <div className="flex items-center justify-between">
                      <span className="capitalize">{p.provider}</span>
                      <Pill tone={p.status === "PAID" ? "green" : p.status === "FAILED" ? "red" : "neutral"}>{PAYMENT_STATUS_LABEL[p.status]}</Pill>
                    </div>
                    <p className="mt-1 break-all text-xs text-stone">Ref: {p.reference}</p>
                    {p.providerRef && <p className="break-all text-xs text-stone">Provider ref: {p.providerRef}</p>}
                    <p className="text-xs text-stone">{formatMoney(p.amount, p.currency)} · {p.channel ?? "—"} · {formatDateTime(p.createdAt)}</p>
                    {p.gatewayResponse && <p className="text-xs text-stone">{p.gatewayResponse}</p>}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-stone">Refunds are made in your Stripe or Paystack dashboard. Then set this order to “Refunded” so stock goes back on the shelf.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
