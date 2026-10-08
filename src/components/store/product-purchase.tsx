"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Price, Stars } from "@/components/ui/bits";
import { CheckIcon, HeartIcon, ReturnIcon, ShareIcon, TruckIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { useCart } from "./cart-context";
import { QuantityInput } from "./quantity-input";
import { ProductGallery } from "./product-gallery";

export type PurchaseVariant = { id: string; name: string; price: number; compareAt: number | null; stock: number; imageUrl: string | null; lowStockThreshold: number };

export function ProductHero({
  product,
  variants,
  images,
  zones,
  currency,
  returnsSummary,
}: {
  product: { id: string; name: string; slug: string; shortDescription: string | null; rating: number; reviewCount: number; category: string | null; videoUrl: string | null; optionType: string; size: string | null; manualOutOfStock: boolean };
  variants: PurchaseVariant[];
  images: { url: string; alt: string | null }[];
  zones: { name: string; fee: number; freeOverAmount: number | null; estimatedDelivery: string | null }[];
  currency: string;
  returnsSummary: string;
}) {
  const { add, wishlist, toggleSaved } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const [variantId, setVariantId] = useState(() => (variants.find((v) => v.stock > 0) ?? variants[0])?.id);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<"add" | "buy" | null>(null);
  const v = variants.find((x) => x.id === variantId) ?? variants[0];
  const inStock = !product.manualOutOfStock && !!v && v.stock > 0;
  const saved = wishlist.has(product.id);
  const showVariants = variants.length > 1;

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link copied — share it anywhere.", "success");
      }
    } catch {
      /* user cancelled */
    }
  };

  const onAdd = async (buyNow: boolean) => {
    if (!v) return;
    setBusy(buyNow ? "buy" : "add");
    const ok = await add(v.id, qty, { openDrawer: !buyNow });
    setBusy(null);
    if (ok && buyNow) router.push("/checkout");
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
      <ProductGallery images={images} name={product.name} videoUrl={product.videoUrl} activeImage={v?.imageUrl} />

      <div className="lg:sticky lg:top-28 lg:self-start">
        {product.category && <p className="eyebrow text-stone">{product.category}</p>}
        <h1 className="mt-3 font-display text-[2.4rem] leading-[1.05] sm:text-5xl">{product.name}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {product.reviewCount > 0 ? (
            <a href="#reviews" className="flex items-center gap-2 text-sm text-stone hover:text-ink">
              <Stars value={product.rating} /> {product.rating.toFixed(1)} · {product.reviewCount} {product.reviewCount === 1 ? "review" : "reviews"}
            </a>
          ) : (
            <a href="#reviews" className="text-sm text-stone underline underline-offset-4 hover:text-ink">Be the first to review</a>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          {v && <Price amount={v.price} compareAt={v.compareAt} currency={currency} size="lg" />}
          {v?.compareAt && (
            <span className="bg-champagne/40 px-2 py-1 text-[0.68rem] font-medium uppercase tracking-wider text-gold-deep">
              Save {Math.round(((v.compareAt - v.price) / v.compareAt) * 100)}%
            </span>
          )}
        </div>

        {product.shortDescription && <p className="mt-6 max-w-lg leading-relaxed text-charcoal">{product.shortDescription}</p>}

        {showVariants && (
          <fieldset className="mt-8">
            <legend className="eyebrow mb-3 text-charcoal">
              {product.optionType}: <span className="normal-case tracking-normal text-stone">{v?.name}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {variants.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => {
                    setVariantId(x.id);
                    setQty(1);
                  }}
                  aria-pressed={x.id === variantId}
                  className={cn(
                    "relative min-w-[5.5rem] border px-4 py-3 text-sm transition-all duration-300",
                    x.id === variantId ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:border-ink",
                    x.stock <= 0 && x.id !== variantId && "text-mist",
                  )}
                >
                  <span className={cn(x.stock <= 0 && "line-through")}>{x.name}</span>
                  <span className={cn("block text-[0.7rem]", x.id === variantId ? "text-champagne" : "text-stone")}>{formatMoney(x.price, currency)}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {!showVariants && product.size && <p className="mt-6 text-sm text-stone">Size: <span className="text-ink">{product.size}</span></p>}

        <p className={cn("mt-6 flex items-center gap-2 text-sm", inStock ? "text-success" : "text-danger")} aria-live="polite">
          <span className={cn("size-2 rounded-full", inStock ? "bg-success" : "bg-danger")} />
          {!inStock ? "Out of stock" : v.stock <= v.lowStockThreshold ? `Only ${v.stock} left — order soon` : "In stock, ready to ship"}
        </p>

        <div className="mt-4 flex gap-3">
          <QuantityInput value={qty} onChange={setQty} max={Math.max(1, Math.min(20, v?.stock ?? 1))} />
          <Button className="flex-1" size="lg" onClick={() => onAdd(false)} disabled={!inStock || busy !== null} loading={busy === "add"} loadingText="Adding to bag…">
            {inStock ? "Add to bag" : "Sold out"}
          </Button>
          <button
            onClick={() => toggleSaved(product.id)}
            className={cn("grid size-14 shrink-0 place-items-center border transition-colors", saved ? "border-gold bg-champagne/20 text-gold-deep" : "border-line bg-white hover:border-ink")}
            aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
            aria-pressed={saved}
          >
            <HeartIcon size={20} filled={saved} />
          </button>
        </div>
        <Button variant="gold" size="lg" className="mt-3 w-full" onClick={() => onAdd(true)} disabled={!inStock || busy !== null} loading={busy === "buy"} loadingText="Taking you to checkout…">
          Buy it now
        </Button>

        <div className="mt-8 divide-y divide-line border-y border-line text-sm">
          <div className="flex gap-4 py-4">
            <TruckIcon size={22} className="mt-0.5 shrink-0 text-gold-deep" />
            <div>
              <p className="font-medium">Shipping</p>
              {zones.length ? (
                <ul className="mt-1.5 space-y-1 text-stone">
                  {zones.slice(0, 4).map((z) => (
                    <li key={z.name}>
                      {z.name}: {z.estimatedDelivery ?? "—"} · {z.fee ? formatMoney(z.fee, currency) : "Free"}
                      {z.freeOverAmount ? <span className="text-gold-deep"> (free over {formatMoney(z.freeOverAmount, currency)})</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-stone">Shipping fees are shown at checkout.</p>
              )}
            </div>
          </div>
          <div className="flex gap-4 py-4">
            <ReturnIcon size={22} className="mt-0.5 shrink-0 text-gold-deep" />
            <div>
              <p className="font-medium">Returns</p>
              <p className="mt-1 text-stone">{returnsSummary} <a href="/returns-refunds" className="underline underline-offset-4 hover:text-ink">Details</a></p>
            </div>
          </div>
          <div className="flex gap-4 py-4">
            <CheckIcon size={22} className="mt-0.5 shrink-0 text-gold-deep" />
            <p className="text-stone">Secure checkout. We never see or store your card details.</p>
          </div>
        </div>

        <button onClick={share} className="eyebrow mt-6 flex items-center gap-2 text-stone hover:text-ink">
          <ShareIcon size={17} /> Share
        </button>
      </div>
    </div>
  );
}

export function AddAllToBag({ variantIds, label = "Add all to bag" }: { variantIds: string[]; label?: string }) {
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      loading={busy}
      loadingText="Adding to bag…"
      disabled={!variantIds.length}
      onClick={async () => {
        setBusy(true);
        for (const [i, id] of variantIds.entries()) await add(id, 1, { openDrawer: i === variantIds.length - 1 });
        setBusy(false);
      }}
    >
      {label}
    </Button>
  );
}
