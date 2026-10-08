"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/bits";
import { BagIcon, LockIcon, TagIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CartView } from "@/lib/cart";
import { useCart } from "./cart-context";
import { CartLineRow, FreeShippingBar } from "./cart-drawer";

export function CartPageClient({ initial }: { initial: CartView; currency?: string }) {
  const { view: live, refresh } = useCart();
  const view = live ?? initial;
  const currency = view.currency;
  useEffect(() => {
    refresh();
  }, [refresh]);

  if (view.lines.length === 0) {
    return (
      <EmptyState icon={<BagIcon size={26} />} title="Your bag is waiting for something beautiful." message="Explore our body oils, scrubs and gift sets.">
        <ButtonLink href="/shop">Shop the collection</ButtonLink>
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
      <ul className="divide-y divide-line border-y border-line">
        {view.lines.map((l) => (
          <CartLineRow key={l.id} line={l} currency={currency} large />
        ))}
      </ul>
      <OrderSummary view={view} currency={currency} />
    </div>
  );
}

export function CouponBox({ applied, label }: { applied: string | null; label: string | null }) {
  const { coupon, clearCoupon } = useCart();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  if (applied) {
    return (
      <div className="flex items-center justify-between border border-dashed border-gold bg-champagne/15 px-4 py-3 text-sm">
        <span className="flex items-center gap-2">
          <TagIcon size={16} className="text-gold-deep" />
          <strong className="font-medium">{applied}</strong> {label && <span className="text-stone">· {label}</span>}
        </span>
        <button onClick={() => clearCoupon()} className="text-xs text-stone underline underline-offset-4 hover:text-ink">
          Remove
        </button>
      </div>
    );
  }
  // Not a <form>: this box also sits inside the checkout form, and forms can't be nested.
  const submit = async () => {
    if (!code.trim()) return;
    setBusy(true);
    const ok = await coupon(code);
    setBusy(false);
    if (ok) setCode("");
  };
  return (
    <div className="flex gap-2" role="group" aria-label="Discount code">
      <label htmlFor="coupon" className="sr-only">Discount code</label>
      <input
        id="coupon"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Discount code"
        className="h-12 min-w-0 flex-1 border border-line bg-white px-4 text-sm uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal focus:border-ink focus:outline-none"
        autoComplete="off"
      />
      <Button variant="outline" loading={busy} disabled={!code.trim()} onClick={submit}>
        Apply
      </Button>
    </div>
  );
}

function OrderSummary({ view, currency }: { view: CartView; currency: string }) {
  const t = view.totals;
  return (
    <aside className="h-fit border border-line bg-cream p-6 sm:p-8 lg:sticky lg:top-28" aria-label="Order summary">
      <h2 className="font-display text-2xl">Summary</h2>
      <div className="mt-6">
        <CouponBox applied={t.couponCode} label={t.couponLabel} />
      </div>
      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between"><dt className="text-stone">Subtotal</dt><dd className="tabular-nums">{formatMoney(t.subtotal, currency)}</dd></div>
        {t.discount > 0 && (
          <div className="flex justify-between text-gold-deep"><dt>Discount</dt><dd className="tabular-nums">−{formatMoney(t.discount, currency)}</dd></div>
        )}
        <div className="flex justify-between"><dt className="text-stone">Shipping &amp; tax</dt><dd className="text-right text-stone">{t.couponLabel === "Free delivery" ? "Free" : "Calculated at checkout"}</dd></div>
      </dl>
      {t.amountToFreeShipping !== null && t.amountToFreeShipping > 0 && (
        <div className="mt-5"><FreeShippingBar remaining={t.amountToFreeShipping} threshold={t.zone?.freeOverAmount ?? 0} currency={currency} /></div>
      )}
      <div className="mt-6 flex items-baseline justify-between border-t border-line pt-5">
        <span className="eyebrow">Estimated total</span>
        <span className="text-xl tabular-nums">{formatMoney(t.subtotal - t.discount, currency)}</span>
      </div>
      {view.hasIssues && <p className="mt-4 text-sm text-danger">Please update the highlighted items before checking out.</p>}
      <ButtonLink href="/checkout" size="lg" className={cn("mt-6 w-full", view.hasIssues && "pointer-events-none opacity-50")} aria-disabled={view.hasIssues}>
        <LockIcon size={16} /> Secure checkout
      </ButtonLink>
      <ButtonLink href="/shop" variant="link" className="mt-4 w-full text-sm">
        Continue shopping
      </ButtonLink>
    </aside>
  );
}
