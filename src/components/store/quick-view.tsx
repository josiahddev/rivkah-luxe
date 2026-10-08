"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Price, Skeleton, Stars } from "@/components/ui/bits";
import { quickView } from "@/server/shop";
import { cn } from "@/lib/utils";
import { useCart } from "./cart-context";
import { QuantityInput } from "./quantity-input";

type QV = NonNullable<Awaited<ReturnType<typeof quickView>>>;

export function QuickView({ productId, open, onClose, currency }: { productId: string; open: boolean; onClose: () => void; currency: string }) {
  const [data, setData] = useState<QV | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const { add } = useCart();

  useEffect(() => {
    let alive = true;
    quickView(productId).then((d) => {
      if (!alive || !d) return;
      setData(d);
      setVariantId(d.variantsFull.find((v) => v.stock > 0)?.id ?? d.variantsFull[0]?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, [productId]);

  const v = data?.variantsFull.find((x) => x.id === variantId);
  const image = v?.imageUrl || data?.images[0]?.url;

  return (
    <Modal open={open} onClose={onClose} title={data?.name ?? "Quick view"} hideTitle className="sm:max-w-3xl">
      {!data ? (
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <Skeleton className="aspect-[4/5]" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2">
          <div className="relative aspect-[4/5] bg-sand">
            {image && <Image src={image} alt={data.name} fill sizes="(min-width:640px) 384px, 100vw" className="object-cover" />}
          </div>
          <div className="flex flex-col p-6 sm:p-8">
            {data.category && <p className="eyebrow text-stone">{data.category}</p>}
            <h2 className="mt-2 font-display text-3xl leading-tight">{data.name}</h2>
            {data.reviewCount > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-stone">
                <Stars value={data.rating} size={13} /> {data.reviewCount} reviews
              </div>
            )}
            <div className="mt-4">
              <Price amount={v?.price ?? data.price} compareAt={v?.compareAt ?? data.compareAt} currency={data.currency} size="lg" />
            </div>
            {data.shortDescription && <p className="mt-4 text-sm leading-relaxed text-stone">{data.shortDescription}</p>}

            {data.variantsFull.length > 1 && (
              <fieldset className="mt-6">
                <legend className="eyebrow mb-3 text-charcoal">{data.optionType}</legend>
                <div className="flex flex-wrap gap-2">
                  {data.variantsFull.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => setVariantId(x.id)}
                      aria-pressed={x.id === variantId}
                      className={cn(
                        "min-w-16 border px-4 py-2.5 text-sm transition-colors",
                        x.id === variantId ? "border-ink bg-ink text-ivory" : "border-line hover:border-ink",
                        x.stock <= 0 && "text-mist line-through",
                      )}
                    >
                      {x.name}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="mt-6 flex gap-3">
              <QuantityInput value={qty} onChange={setQty} max={Math.max(1, Math.min(20, v?.stock ?? 1))} />
              <Button
                className="flex-1"
                disabled={!v || v.stock <= 0}
                loading={adding}
                loadingText="Adding to bag…"
                onClick={async () => {
                  if (!v) return;
                  setAdding(true);
                  const ok = await add(v.id, qty);
                  setAdding(false);
                  if (ok) onClose();
                }}
              >
                {v && v.stock <= 0 ? "Out of stock" : "Add to bag"}
              </Button>
            </div>
            {v && v.stock > 0 && v.stock <= 5 && <p className="mt-3 text-xs text-gold-deep">Only {v.stock} left</p>}
            <Link href={`/products/${data.slug}`} onClick={onClose} className="eyebrow mt-auto pt-6 text-stone underline underline-offset-4 hover:text-ink">
              View full details
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
