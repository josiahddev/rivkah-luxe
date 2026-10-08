import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { countryName } from "@/lib/regions";
import { PAYMENT_STATUS_LABEL } from "@/lib/order-status";
import { PrintButton } from "@/components/admin/print-button";

export const metadata = { title: "Invoice", robots: { index: false } };

// Printable invoice (opens in a new tab; use the browser's Print → Save as PDF to download).
export default async function InvoicePage({ params }: PageProps<"/admin/invoice/[id]">) {
  await requireAdmin("orders");
  const { id } = await params;
  const [o, s] = await Promise.all([db.order.findUnique({ where: { id }, include: { items: true, payments: { where: { status: "PAID" }, take: 1 } } }), getSettings()]);
  if (!o) notFound();
  const m = (n: number) => formatMoney(n, o.currency);
  return (
    <main className="mx-auto max-w-3xl bg-white p-8 text-ink sm:p-12 print:p-0">
      <div className="no-print mb-8 flex justify-end"><PrintButton /></div>
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-ink pb-8">
        <div>
          <p className="font-display text-3xl tracking-[0.3em]">{s.storeName.toUpperCase()}</p>
          <p className="mt-2 whitespace-pre-line text-sm text-stone">{s.address}</p>
          <p className="text-sm text-stone">{s.businessEmail}{s.phone ? ` · ${s.phone}` : ""}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-display text-3xl">Invoice</p>
          <p className="mt-2">No. {o.orderNumber}</p>
          <p className="text-stone">Date {formatDate(o.paidAt ?? o.createdAt)}</p>
          <p className="text-stone">{PAYMENT_STATUS_LABEL[o.paymentStatus]}{o.payments[0] ? ` · ref ${o.payments[0].reference}` : ""}</p>
        </div>
      </header>
      <section className="grid gap-6 py-8 text-sm sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.15em] text-stone">Bill to</p>
          <p>{o.customerName}<br />{o.email}<br />{o.phone}</p>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.15em] text-stone">Ship to</p>
          <p>{o.addressLine1}{o.addressLine2 ? `, ${o.addressLine2}` : ""}<br />{o.city}, {o.state} {o.postalCode}<br />{countryName(o.country)}</p>
        </div>
      </section>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-ink text-left text-xs uppercase tracking-[0.12em] text-stone"><th className="py-2">Item</th><th className="py-2">SKU</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Total</th></tr></thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id} className="border-b border-line">
              <td className="py-3">{i.productName}{i.variantName ? ` — ${i.variantName}` : ""}</td>
              <td className="py-3 text-stone">{i.sku}</td>
              <td className="py-3 text-right">{i.quantity}</td>
              <td className="py-3 text-right">{m(i.unitPrice)}</td>
              <td className="py-3 text-right">{m(i.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto mt-6 w-full max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{m(o.subtotal)}</dd></div>
        {o.discountTotal > 0 && <div className="flex justify-between"><dt>Discount {o.couponCode && `(${o.couponCode})`}</dt><dd>−{m(o.discountTotal)}</dd></div>}
        <div className="flex justify-between"><dt>Shipping</dt><dd>{o.shippingFee ? m(o.shippingFee) : "Free"}</dd></div>
        {o.taxTotal > 0 && <div className="flex justify-between"><dt>{s.tax.label}</dt><dd>{m(o.taxTotal)}</dd></div>}
        <div className="flex justify-between border-t border-ink pt-2 text-base font-medium"><dt>Total ({o.currency})</dt><dd>{m(o.total)}</dd></div>
      </dl>
      <p className="mt-16 text-center font-display text-xl italic text-gold-deep">Thank you for choosing {s.storeName}.</p>
    </main>
  );
}
