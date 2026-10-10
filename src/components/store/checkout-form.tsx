"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { placeOrder } from "@/server/checkout";
import { previewTotals } from "@/server/cart";
import { Button } from "@/components/ui/button";
import { Checkbox, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { LockIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/money";
import { postalLabel, postalRequired, regionLabel, regionOptions } from "@/lib/regions";
import type { CartView } from "@/lib/cart";
import type { Totals } from "@/lib/pricing";
import { CouponBox } from "./cart-page";
import { useCart } from "./cart-context";
import { PaymentBadges } from "./payment-badges";

type Addr = { id: string; label: string | null; fullName: string; phone: string; line1: string; line2: string | null; city: string; state: string; postalCode: string | null; country: string };

export function CheckoutForm({
  initialView,
  initialCountry,
  countries,
  user,
  addresses,
  payment,
}: {
  initialView: CartView;
  initialCountry: string;
  countries: { value: string; label: string }[];
  user: { name: string; email: string; phone: string | null } | null;
  addresses: Addr[];
  payment: { available: boolean; providerLabel: string; chargeCurrency: string; displayCurrency: string };
}) {
  const { view: liveCart } = useCart();
  const view = liveCart ?? initialView;
  const def = addresses[0];
  const [state, action, pending] = useActionState(placeOrder, null);
  const [country, setCountry] = useState(def?.country ?? initialCountry);
  const [region, setRegion] = useState(def?.state ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [totals, setTotals] = useState<Totals>(initialView.totals);
  const [calculating, setCalculating] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const currency = view.currency;

  // Recalculate shipping and tax whenever the destination or bag changes.
  useEffect(() => {
    let alive = true;
    setCalculating(true);
    const t = setTimeout(async () => {
      try {
        const next = await previewTotals(country, region, email || null);
        if (alive) setTotals(next);
      } finally {
        if (alive) setCalculating(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [country, region, email, view.count, view.couponCode]);

  useEffect(() => {
    if (state?.ok && state.data?.redirectUrl) {
      setRedirecting(true);
      window.location.assign(state.data.redirectUrl);
    }
  }, [state]);

  const fillFrom = (a: Addr) => {
    const f = formRef.current;
    if (!f) return;
    const set = (n: string, v: string) => {
      const el = f.elements.namedItem(n) as HTMLInputElement | null;
      if (el) el.value = v;
    };
    set("customerName", a.fullName);
    set("phone", a.phone);
    set("addressLine1", a.line1);
    set("addressLine2", a.line2 ?? "");
    set("city", a.city);
    set("postalCode", a.postalCode ?? "");
    setCountry(a.country);
    setRegion(a.state);
  };

  const regions = regionOptions(country);
  const busy = pending || redirecting;

  return (
    <form ref={formRef} action={action} className="grid gap-12 lg:grid-cols-[1fr_420px] lg:gap-16" noValidate>
      <div className="space-y-12">
        {/* Contact */}
        <section aria-labelledby="contact-h">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="contact-h" className="font-display text-3xl">Contact</h2>
            {!user && (
              <Link href="/login?next=/checkout" className="text-sm text-stone underline underline-offset-4 hover:text-ink">
                Have an account? Sign in
              </Link>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input name="email" type="email" label="Email" required autoComplete="email" defaultValue={user?.email} onBlur={(e) => setEmail(e.target.value)} error={fe.email} className="sm:col-span-2" hint="Your order confirmation will be sent here." />
            <Input name="customerName" label="Full name" required autoComplete="name" defaultValue={def?.fullName ?? user?.name} error={fe.customerName} />
            <Input name="phone" type="tel" label="Phone" required autoComplete="tel" defaultValue={def?.phone ?? user?.phone ?? ""} error={fe.phone} hint="For delivery updates only." />
          </div>
        </section>

        {/* Address */}
        <section aria-labelledby="ship-h">
          <h2 id="ship-h" className="mb-6 font-display text-3xl">Shipping address</h2>
          {addresses.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {addresses.map((a) => (
                <button key={a.id} type="button" onClick={() => fillFrom(a)} className="border border-line bg-white px-4 py-2 text-left text-sm hover:border-ink">
                  <span className="font-medium">{a.label || a.fullName}</span>
                  <span className="block text-xs text-stone">{a.line1}, {a.city}</span>
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              name="country"
              label="Country"
              required
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setRegion("");
              }}
              options={countries}
              error={fe.country}
              className="sm:col-span-2"
              autoComplete="country"
            />
            <Input name="addressLine1" label="Street address" required autoComplete="address-line1" defaultValue={def?.line1} error={fe.addressLine1} className="sm:col-span-2" />
            <Input name="addressLine2" label="Apartment, suite, etc. (optional)" autoComplete="address-line2" defaultValue={def?.line2 ?? ""} className="sm:col-span-2" />
            <Input name="city" label="City" required autoComplete="address-level2" defaultValue={def?.city} error={fe.city} />
            {regions ? (
              <Select name="state" label={regionLabel(country)} required value={region} onChange={(e) => setRegion(e.target.value)} error={fe.state} autoComplete="address-level1">
                <option value="">Choose…</option>
                {regions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Input name="state" label={regionLabel(country)} required value={region} onChange={(e) => setRegion(e.target.value)} error={fe.state} autoComplete="address-level1" />
            )}
            <Input
              name="postalCode"
              label={postalLabel(country)}
              required={postalRequired(country)}
              autoComplete="postal-code"
              defaultValue={def?.postalCode ?? ""}
              error={fe.postalCode}
              inputClassName="uppercase"
            />
            <Textarea name="deliveryInstructions" label="Delivery notes (optional)" rows={3} placeholder="Buzzer code, gift message, best time to deliver…" className="sm:col-span-2" />
          </div>
          {totals.zone && (
            <p className="mt-5 border-l-2 border-gold pl-4 text-sm text-charcoal">
              <span className="font-medium">{totals.zone.name}</span> · {totals.zone.estimatedDelivery ?? "Delivery time confirmed after dispatch"} ·{" "}
              {totals.shippingFee ? formatMoney(totals.shippingFee, currency) : "Free shipping"}
              {country !== "CA" && <span className="block text-xs text-stone">International orders may be charged import duties by your country&apos;s customs.</span>}
            </p>
          )}
        </section>

        <section className="space-y-3">
          {user && <Checkbox name="saveAddress" defaultChecked={addresses.length === 0} label="Save this address to my account" />}
          <Checkbox name="newsletter" label="Email me about new arrivals and offers" description="Optional. You can unsubscribe at any time." />
        </section>
      </div>

      {/* Summary */}
      <aside className="h-fit border border-line bg-cream p-6 sm:p-8 lg:sticky lg:top-28" aria-label="Order summary">
        <h2 className="font-display text-2xl">Your order</h2>
        <ul className="mt-6 space-y-4">
          {view.lines.map((l) => (
            <li key={l.id} className="flex gap-4">
              <div className="relative h-20 w-16 shrink-0 bg-sand">
                {l.image && <Image src={l.image} alt="" fill sizes="64px" className="object-cover" />}
                <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-ink text-[0.6rem] text-ivory">{l.quantity}</span>
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-display text-base leading-snug">{l.name}</p>
                {l.variantName && <p className="text-xs text-stone">{l.variantName}</p>}
                {l.issue && <p className="text-xs text-danger">{l.issue}</p>}
              </div>
              <p className="text-sm tabular-nums">{formatMoney(l.lineTotal, currency)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <CouponBox applied={totals.couponCode ?? view.totals.couponCode} label={totals.couponLabel ?? view.totals.couponLabel} />
        </div>
        <dl className={`mt-6 space-y-3 text-sm transition-opacity ${calculating ? "opacity-50" : ""}`} aria-live="polite">
          <Row label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
          {totals.discount > 0 && <Row label={`Discount (${totals.couponCode})`} value={`−${formatMoney(totals.discount, currency)}`} gold />}
          <Row label="Shipping" value={totals.zone ? (totals.shippingFee ? formatMoney(totals.shippingFee, currency) : "Free") : "—"} />
          {totals.taxRate > 0 && <Row label={`${totals.taxLabel} (${totals.taxRate}%)`} value={formatMoney(totals.tax, currency)} />}
        </dl>
        <div className="mt-6 flex items-baseline justify-between border-t border-line pt-5">
          <span className="eyebrow">Total</span>
          <span className="text-2xl tabular-nums">{formatMoney(totals.total, currency)}</span>
        </div>
        {payment.chargeCurrency !== payment.displayCurrency && (
          <p className="mt-3 text-xs text-stone">Your payment will be taken in {payment.chargeCurrency}. The exact amount is shown on the payment page.</p>
        )}

        <div className="mt-6 space-y-3">
          <FormError message={state && !state.ok ? state.error : null} />
          {!payment.available && <FormError message="Online payment isn't available right now. Please contact us and we'll help you complete your order." />}
          <Button type="submit" size="lg" className="w-full" loading={busy} loadingText={redirecting ? "Taking you to secure payment…" : "Processing…"} disabled={!payment.available || view.hasIssues}>
            <LockIcon size={16} /> Pay {formatMoney(totals.total, currency)}
          </Button>
          <PaymentBadges size="sm" className="justify-center" />
          {payment.available && (
            <p className="text-center text-xs text-stone">
              You&apos;ll pay securely with {payment.providerLabel}. We never see or store your card details.
            </p>
          )}
          <p className="text-center text-xs text-stone">
            By placing your order you agree to our <Link href="/terms-and-conditions" className="underline">Terms</Link> and{" "}
            <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </aside>
    </form>
  );
}

function Row({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className={`flex justify-between ${gold ? "text-gold-deep" : ""}`}>
      <dt className={gold ? "" : "text-stone"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
