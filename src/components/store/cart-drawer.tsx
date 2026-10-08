"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Drawer } from "@/components/ui/dialog";
import { Button, ButtonLink } from "@/components/ui/button";
import { Price, Skeleton } from "@/components/ui/bits";
import { BagIcon, MinusIcon, PlusIcon, TruckIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useCart } from "./cart-context";

export function CartDrawer({ currency: baseCurrency }: { currency: string }) {
  const { isOpen, close, view, pending, count } = useCart();
  const currency = view?.currency ?? baseCurrency;
  const lines = view?.lines ?? [];
  const totals = view?.totals;

  return (
    <Drawer
      open={isOpen}
      onClose={close}
      title={
        <span>
          Your Bag <span className="font-sans text-sm text-stone">({count})</span>
        </span>
      }
      footer={
        lines.length > 0 && totals ? (
          <div className="space-y-4 p-5">
            {totals.amountToFreeShipping !== null && totals.amountToFreeShipping > 0 && (
              <FreeShippingBar remaining={totals.amountToFreeShipping} threshold={totals.zone?.freeOverAmount ?? 0} currency={currency} />
            )}
            <div className="flex items-baseline justify-between">
              <span className="eyebrow text-stone">Subtotal</span>
              <span className="text-lg tabular-nums">{formatMoney(totals.subtotal, currency)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-sm text-gold-deep">
                <span>Discount ({totals.couponCode})</span>
                <span className="tabular-nums">−{formatMoney(totals.discount, currency)}</span>
              </div>
            )}
            <p className="text-xs text-stone">Shipping and taxes are calculated at checkout.</p>
            <div className="grid gap-2">
              <ButtonLink href="/checkout" onClick={close} size="lg" className={cn(view?.hasIssues && "pointer-events-none opacity-50")}>
                Checkout
              </ButtonLink>
              <ButtonLink href="/cart" onClick={close} variant="ghost" size="sm">
                View bag
              </ButtonLink>
            </div>
          </div>
        ) : null
      }
    >
      {!view && pending ? (
        <div className="space-y-5 p-5">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-28 w-22 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : lines.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
          <div className="mb-6 grid size-16 place-items-center rounded-full border border-gold/40 text-gold">
            <BagIcon size={26} />
          </div>
          <p className="font-display text-3xl leading-tight">Your bag is waiting for something beautiful.</p>
          <p className="mt-3 text-sm text-stone">Discover our body oils, scrubs and gift sets.</p>
          <ButtonLink href="/shop" onClick={close} className="mt-8">
            Shop the collection
          </ButtonLink>
        </div>
      ) : (
        <ul className={cn("divide-y divide-line transition-opacity", pending && "opacity-60")}>
          {lines.map((l) => (
            <CartLineRow key={l.id} line={l} currency={currency} onNavigate={close} />
          ))}
        </ul>
      )}
    </Drawer>
  );
}

export function FreeShippingBar({ remaining, threshold, currency }: { remaining: number; threshold: number; currency: string }) {
  const pct = threshold ? Math.min(100, Math.round(((threshold - remaining) / threshold) * 100)) : 0;
  return (
    <div>
      <p className="flex items-center gap-2 text-xs text-charcoal">
        <TruckIcon size={16} className="text-gold-deep" />
        You&apos;re {formatMoney(remaining, currency)} away from free shipping
      </p>
      <div className="mt-2 h-[3px] w-full bg-sand" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free shipping">
        <div className="h-full bg-gold transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CartLineRow({
  line: l,
  currency,
  onNavigate,
  large,
}: {
  line: NonNullable<ReturnType<typeof useCart>["view"]>["lines"][number];
  currency: string;
  onNavigate?: () => void;
  large?: boolean;
}) {
  const { setQty } = useCart();
  const [busy, setBusy] = useState(false);
  const change = async (q: number) => {
    setBusy(true);
    await setQty(l.id, q);
    setBusy(false);
  };
  return (
    <li className={cn("flex gap-4 p-5", busy && "opacity-60")}>
      <Link href={`/products/${l.slug}`} onClick={onNavigate} className={cn("relative shrink-0 overflow-hidden bg-sand", large ? "h-36 w-28" : "h-28 w-22")}>
        {l.image && <Image src={l.image} alt={l.name} fill sizes="112px" className="object-cover" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/products/${l.slug}`} onClick={onNavigate} className="font-display text-lg leading-snug hover:text-gold-deep">
              {l.name}
            </Link>
            {l.variantName && <p className="mt-0.5 text-xs text-stone">{l.variantName}</p>}
          </div>
          <Price amount={l.lineTotal} currency={currency} size="sm" className="shrink-0" />
        </div>
        {l.issue && <p className="mt-1 text-xs font-medium text-danger">{l.issue}</p>}
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex h-9 items-center border border-line" role="group" aria-label={`Quantity for ${l.name}`}>
            <button className="grid h-full w-9 place-items-center text-stone hover:text-ink disabled:opacity-40" onClick={() => change(l.quantity - 1)} disabled={busy} aria-label="Decrease quantity">
              <MinusIcon size={14} />
            </button>
            <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{l.quantity}</span>
            <button
              className="grid h-full w-9 place-items-center text-stone hover:text-ink disabled:opacity-40"
              onClick={() => change(l.quantity + 1)}
              disabled={busy || l.quantity >= l.stock}
              aria-label="Increase quantity"
            >
              <PlusIcon size={14} />
            </button>
          </div>
          <Button variant="link" className="text-xs text-stone" onClick={() => change(0)} disabled={busy}>
            Remove
          </Button>
        </div>
        {l.compareAt && <p className="mt-2 text-[0.7rem] text-gold-deep">On sale · was {formatMoney(l.compareAt, currency)} each</p>}
      </div>
    </li>
  );
}
