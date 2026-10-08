"use client";

import { useEffect, useState } from "react";
import { recentlyViewedCards, recordProductView } from "@/server/shop";
import type { ProductCardData } from "@/lib/catalog";
import { SectionHeading } from "@/components/ui/bits";
import { ProductCard } from "./product-card";

const KEY = "rl_recently_viewed";

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

/** Remember that this product was viewed (stored only in the visitor's browser). */
export function TrackView({ productId }: { productId: string }) {
  useEffect(() => {
    try {
      const list = [productId, ...read().filter((x) => x !== productId)].slice(0, 12);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
    recordProductView(productId).catch(() => {});
  }, [productId]);
  return null;
}

export function RecentlyViewed({ excludeId, currency, title = "Recently viewed" }: { excludeId?: string; currency: string; title?: string }) {
  const [items, setItems] = useState<ProductCardData[]>([]);
  useEffect(() => {
    const ids = read().filter((x) => x !== excludeId).slice(0, 4);
    if (!ids.length) return;
    recentlyViewedCards(ids).then(setItems).catch(() => {});
  }, [excludeId]);
  if (!items.length) return null;
  return (
    <section className="container-luxe py-16" aria-label={title}>
      <SectionHeading title={title} align="left" className="mb-10" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} currency={currency} />
        ))}
      </div>
    </section>
  );
}
