import "server-only";
import { formatMoney } from "@/lib/money";
import { siteUrl } from "@/lib/utils";
import type { StoreSettings } from "@/lib/settings";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import type { OrderStatus } from "@/generated/prisma/enums";
import { countryName } from "@/lib/regions";

// Email-safe brand palette (inline styles only — email clients ignore <style>).
const INK = "#0e0d0b";
const CREAM = "#f7f2ea";
const GOLD = "#b8955a";
const MUTED = "#6f675e";

function esc(s: string | null | undefined) {
  return (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(settings: StoreSettings, title: string, body: string) {
  const year = new Date().getFullYear();
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:Georgia,'Times New Roman',serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff">
<tr><td style="background:${INK};padding:28px 32px;text-align:center">
<div style="font-family:Georgia,serif;font-size:22px;letter-spacing:8px;color:${GOLD}">RIVKAH LUXE</div>
</td></tr>
<tr><td style="padding:40px 32px 32px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${INK}">
${body}
</td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid #ece4d8;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${MUTED};text-align:center">
${esc(settings.storeName)}${settings.address ? ` · ${esc(settings.address)}` : ""}<br>
${settings.businessEmail ? `<a href="mailto:${esc(settings.businessEmail)}" style="color:${MUTED}">${esc(settings.businessEmail)}</a>` : ""}${settings.phone ? ` · ${esc(settings.phone)}` : ""}<br>
© ${year} ${esc(settings.storeName)}
</td></tr>
</table></td></tr></table></body></html>`;
}

function heading(text: string) {
  return `<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:28px;line-height:1.25;margin:0 0 16px">${esc(text)}</h1>`;
}

function button(href: string, label: string) {
  return `<p style="margin:28px 0"><a href="${href}" style="display:inline-block;background:${INK};color:#ffffff;text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:2px;text-transform:uppercase">${esc(label)}</a></p>`;
}

export type EmailOrder = {
  orderNumber: string;
  customerName: string;
  email: string;
  createdAt: Date;
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  taxTotal: number;
  total: number;
  currency: string;
  status: OrderStatus;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode?: string | null;
  country: string;
  deliveryEstimate: string | null;
  items: { productName: string; variantName: string | null; quantity: number; lineTotal: number }[];
};

function orderTable(o: EmailOrder) {
  const m = (n: number) => formatMoney(n, o.currency);
  const rows = o.items
    .map(
      (i) => `<tr><td style="padding:10px 0;border-bottom:1px solid #f0e9df">${esc(i.productName)}${i.variantName ? ` <span style="color:${MUTED}">· ${esc(i.variantName)}</span>` : ""} × ${i.quantity}</td><td style="padding:10px 0;border-bottom:1px solid #f0e9df;text-align:right">${m(i.lineTotal)}</td></tr>`,
    )
    .join("");
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:6px 0;${bold ? "font-weight:bold" : `color:${MUTED}`}">${label}</td><td style="padding:6px 0;text-align:right;${bold ? "font-weight:bold" : ""}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:20px 0">${rows}
${line("Subtotal", m(o.subtotal))}
${o.discountTotal ? line("Discount", `-${m(o.discountTotal)}`) : ""}
${line("Delivery", o.shippingFee ? m(o.shippingFee) : "Free")}
${o.taxTotal ? line("Tax", m(o.taxTotal)) : ""}
${line("Total", m(o.total), true)}
</table>
<p style="font-size:13px;color:${MUTED};margin:0">Delivering to: ${esc(o.customerName)}, ${esc(o.addressLine1)}${o.addressLine2 ? `, ${esc(o.addressLine2)}` : ""}, ${esc(o.city)}, ${esc(o.state)}${o.postalCode ? ` ${esc(o.postalCode)}` : ""}, ${esc(countryName(o.country))}${o.deliveryEstimate ? `<br>Estimated delivery: ${esc(o.deliveryEstimate)}` : ""}</p>`;
}

const trackUrl = (o: EmailOrder) =>
  siteUrl(`/track-order?order=${encodeURIComponent(o.orderNumber)}&email=${encodeURIComponent(o.email)}`);

export function welcomeEmail(s: StoreSettings, name: string) {
  const subject = `Welcome to ${s.storeName}`;
  return {
    subject,
    template: "welcome",
    html: layout(s, subject, `${heading(`Welcome, ${name.split(" ")[0]}.`)}
<p>Your account is ready. You can now save your favourites, check out faster and follow your orders from one place.</p>
${button(siteUrl("/shop"), "Explore the collection")}
<p style="color:${MUTED};font-size:13px">If you didn't create this account, please reply to this email.</p>`),
    text: `Welcome, ${name}. Your ${s.storeName} account is ready. Shop: ${siteUrl("/shop")}`,
  };
}

export function orderReceivedEmail(s: StoreSettings, o: EmailOrder) {
  const subject = `Order ${o.orderNumber} confirmed — thank you`;
  return {
    subject,
    template: "order-confirmation",
    html: layout(s, subject, `${heading("Thank you for your order.")}
<p>Hi ${esc(o.customerName.split(" ")[0])}, we've received your payment and your order <strong>${esc(o.orderNumber)}</strong> is confirmed. We'll let you know as soon as it's on its way.</p>
${orderTable(o)}
${button(trackUrl(o), "Track your order")}`),
    text: `Thank you for your order ${o.orderNumber}. Total ${formatMoney(o.total, o.currency)}. Track it: ${trackUrl(o)}`,
  };
}

export function paymentConfirmedEmail(s: StoreSettings, o: EmailOrder, reference: string) {
  const subject = `Payment received for ${o.orderNumber}`;
  return {
    subject,
    template: "payment-confirmation",
    html: layout(s, subject, `${heading("Payment received.")}
<p>We've received your payment of <strong>${formatMoney(o.total, o.currency)}</strong> for order <strong>${esc(o.orderNumber)}</strong>.</p>
<p style="color:${MUTED};font-size:13px">Payment reference: ${esc(reference)}</p>`),
    text: `Payment of ${formatMoney(o.total, o.currency)} received for ${o.orderNumber}. Reference ${reference}.`,
  };
}

const STATUS_COPY: Partial<Record<OrderStatus, { title: string; body: string }>> = {
  PROCESSING: { title: "We're preparing your order.", body: "Your order is being carefully packed." },
  READY_FOR_DELIVERY: { title: "Your order is packed.", body: "Your order is packed and ready to be handed to our delivery partner." },
  SHIPPED: { title: "Your order is on its way.", body: "Your order has left our studio and is on its way to you." },
  OUT_FOR_DELIVERY: { title: "Out for delivery today.", body: "Your order is out for delivery. Please keep your phone close." },
  DELIVERED: { title: "Delivered — enjoy.", body: "Your order has been delivered. We hope you love it. We'd be grateful for a review." },
  CANCELLED: { title: "Your order was cancelled.", body: "Your order has been cancelled. If you have any questions, just reply to this email." },
  REFUNDED: { title: "Your refund is on its way.", body: "We've processed a refund for your order. Depending on your bank it can take 5–10 business days to appear." },
};

export function orderStatusEmail(s: StoreSettings, o: EmailOrder, note?: string | null) {
  const copy = STATUS_COPY[o.status];
  if (!copy) return null;
  const subject = `${o.orderNumber}: ${ORDER_STATUS_LABEL[o.status]}`;
  return {
    subject,
    template: `order-${o.status.toLowerCase()}`,
    html: layout(s, subject, `${heading(copy.title)}
<p>Hi ${esc(o.customerName.split(" ")[0])}, ${esc(copy.body)}</p>
${note ? `<p style="background:${CREAM};padding:14px 16px">${esc(note)}</p>` : ""}
<p>Order <strong>${esc(o.orderNumber)}</strong> · ${formatMoney(o.total, o.currency)}</p>
${button(trackUrl(o), "View order status")}`),
    text: `${copy.title} ${copy.body} Order ${o.orderNumber}. ${trackUrl(o)}`,
  };
}

export function passwordResetEmail(s: StoreSettings, name: string, link: string) {
  const subject = "Reset your password";
  return {
    subject,
    template: "password-reset",
    html: layout(s, subject, `${heading("Reset your password")}
<p>Hi ${esc(name.split(" ")[0])}, we received a request to reset your password. This link is valid for 1 hour.</p>
${button(link, "Choose a new password")}
<p style="color:${MUTED};font-size:13px">If you didn't ask for this, you can safely ignore this email — your password won't change.</p>`),
    text: `Reset your password (valid for 1 hour): ${link}`,
  };
}

export function contactAckEmail(s: StoreSettings, name: string, subjectLine: string) {
  const subject = "We've received your message";
  return {
    subject,
    template: "contact-ack",
    html: layout(s, subject, `${heading("Thank you for reaching out.")}
<p>Hi ${esc(name.split(" ")[0])}, we've received your message about "<em>${esc(subjectLine)}</em>" and will get back to you shortly.</p>
${s.contact.hours ? `<p style="color:${MUTED};font-size:13px">Our hours: ${esc(s.contact.hours)}</p>` : ""}`),
    text: `Thanks ${name}, we've received your message and will reply shortly.`,
  };
}

export function adminAlertEmail(s: StoreSettings, title: string, lines: string[], link: string) {
  return {
    subject: title,
    template: "admin-alert",
    html: layout(s, title, `${heading(title)}${lines.map((l) => `<p style="margin:4px 0">${esc(l)}</p>`).join("")}${button(link, "Open dashboard")}`),
    text: `${title}\n${lines.join("\n")}\n${link}`,
  };
}
