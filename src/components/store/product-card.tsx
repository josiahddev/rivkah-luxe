"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Price, Stars } from "@/components/ui/bits";
import { EyeIcon, HeartIcon, PlusIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/button";
import type { ProductCardData } from "@/lib/catalog";
import { useCart } from "./cart-context";
import { QuickView } from "./quick-view";

export function ProductCard({ product: p, priority, sizes }: { product: ProductCardData; currency?: string; priority?: boolean; sizes?: string }) {
  const currency = p.currency;
  const { add, wishlist, toggleSaved } = useCart();
  const [adding, setAdding] = useState(false);
  const [quick, setQuick] = useState(false);
  const saved = wishlist.has(p.id);
  const single = p.variants.length <= 1;
  const discount = p.compareAt ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100) : 0;

  const onAdd = async () => {
    if (!single) {
      setQuick(true);
      return;
    }
    if (!p.defaultVariantId) return;
    setAdding(true);
    await add(p.defaultVariantId, 1);
    setAdding(false);
  };

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden bg-sand">
        <Link href={`/products/${p.slug}`} className="absolute inset-0" aria-label={p.name}>
          {p.image ? (
            <>
              <Image
                src={p.image}
                alt={p.imageAlt}
                fill
                sizes={sizes ?? "(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw"}
                className={cn("object-cover transition-[transform,opacity] duration-[1.2s] ease-[var(--ease-luxe)] group-hover:scale-[1.04]", p.hoverImage && "group-hover:opacity-0")}
                preload={priority}
              />
              {p.hoverImage && (
                <Image
                  src={p.hoverImage}
                  alt=""
                  fill
                  sizes={sizes ?? "(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw"}
                  className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="grid h-full place-items-center font-display text-2xl text-mist">Rivkah Luxe</div>
          )}
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {!p.inStock && <Badge tone="dark">Out of stock</Badge>}
          {p.inStock && discount > 0 && <Badge tone="gold">−{discount}%</Badge>}
          {p.inStock && p.isNew && discount === 0 && <Badge>New</Badge>}
        </div>

        <button
          onClick={() => toggleSaved(p.id)}
          className={cn(
            "absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-ivory/90 backdrop-blur transition-all duration-300 hover:bg-ivory",
            saved ? "text-gold-deep" : "text-ink",
          )}
          aria-label={saved ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`}
          aria-pressed={saved}
        >
          <HeartIcon size={17} filled={saved} />
        </button>

        {/* Desktop hover actions */}
        <div className="absolute inset-x-3 bottom-3 hidden translate-y-2 gap-2 opacity-0 transition-all duration-500 ease-[var(--ease-luxe)] group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
          <button
            onClick={onAdd}
            disabled={!p.inStock || adding}
            className="flex h-11 flex-1 items-center justify-center gap-2 bg-ink text-[0.66rem] font-medium uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-ink-soft disabled:bg-stone"
          >
            {adding ? <><Spinner /> Adding to bag…</> : !p.inStock ? "Sold out" : single ? "Add to bag" : "Choose size"}
          </button>
          <button
            onClick={() => setQuick(true)}
            className="grid size-11 place-items-center bg-ivory text-ink transition-colors hover:bg-sand"
            aria-label={`Quick view ${p.name}`}
          >
            <EyeIcon size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-4">
        {p.category && <p className="eyebrow mb-1.5 text-[0.6rem] text-stone">{p.category}</p>}
        <h3 className="font-display text-[1.2rem] leading-snug">
          <Link href={`/products/${p.slug}`} className="link-luxe">
            {p.name}
          </Link>
        </h3>
        {p.reviewCount > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <Stars value={p.rating} size={12} />
            <span className="text-[0.7rem] text-stone">({p.reviewCount})</span>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <Price amount={p.price} compareAt={p.compareAt} currency={currency} from={p.priceFrom} />
          {/* Mobile add button */}
          <button
            onClick={onAdd}
            disabled={!p.inStock || adding}
            className="grid size-9 shrink-0 place-items-center border border-ink text-ink transition-colors active:bg-ink active:text-ivory disabled:border-line disabled:text-mist md:hidden"
            aria-label={single ? `Add ${p.name} to bag` : `Choose options for ${p.name}`}
          >
            {adding ? <Spinner /> : <PlusIcon size={16} />}
          </button>
        </div>
      </div>

      {quick && <QuickView productId={p.id} open={quick} onClose={() => setQuick(false)} currency={currency} />}
    </article>
  );
}
