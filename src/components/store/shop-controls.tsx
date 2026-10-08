"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Drawer } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FilterIcon, GridIcon } from "@/components/ui/icons";
import { ProductCard } from "./product-card";
import type { ProductCardData, SortKey } from "@/lib/catalog";

type Cat = { name: string; slug: string; count: number };

const SORTS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "best-selling", label: "Best selling" },
  { value: "top-rated", label: "Highest rated" },
];

function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    start(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  return { update, params, pending };
}

export function ShopToolbar({ total, categories, showCategories = true, currencySymbol = "$" }: { total: number; categories: Cat[]; showCategories?: boolean; currencySymbol?: string }) {
  const { update, params, pending } = useQueryUpdater();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sort = (params.get("sort") as SortKey) || "featured";
  const active = ["category", "min", "max", "availability"].filter((k) => params.get(k)).length;

  return (
    <>
      <div className="flex items-center justify-between gap-4 border-y border-line py-3">
        <button onClick={() => setFiltersOpen(true)} className="eyebrow flex items-center gap-2 py-2 lg:hidden">
          <FilterIcon size={18} /> Filter {active > 0 && <span className="grid size-5 place-items-center rounded-full bg-ink text-[0.6rem] text-ivory">{active}</span>}
        </button>
        <p className={cn("hidden text-sm text-stone transition-opacity lg:block", pending && "opacity-50")} aria-live="polite">
          {total} {total === 1 ? "product" : "products"}
        </p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="hidden text-stone sm:inline">Sort by</span>
            <select
              value={sort}
              onChange={(e) => update({ sort: e.target.value === "featured" ? null : e.target.value })}
              className="cursor-pointer bg-transparent py-2 pr-1 text-sm focus:outline-none"
              aria-label="Sort products"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <GridToggle />
        </div>
      </div>
      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} side="left" title="Filter" footer={
        <div className="grid grid-cols-2 gap-3 p-5">
          <Button variant="outline" onClick={() => update({ category: null, min: null, max: null, availability: null })}>Clear all</Button>
          <Button onClick={() => setFiltersOpen(false)}>Show {total}</Button>
        </div>
      }>
        <div className="p-5">
          <ShopFilters categories={categories} showCategories={showCategories} currencySymbol={currencySymbol} />
        </div>
      </Drawer>
    </>
  );
}

export function ShopFilters({ categories, showCategories = true, currencySymbol = "$" }: { categories: Cat[]; showCategories?: boolean; currencySymbol?: string }) {
  const { update, params } = useQueryUpdater();
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");
  useEffect(() => {
    setMin(params.get("min") ?? "");
    setMax(params.get("max") ?? "");
  }, [params]);
  const current = params.get("category");
  const availability = params.get("availability");

  return (
    <div className="space-y-10">
      {showCategories && categories.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-4 text-charcoal">Category</legend>
          <ul className="space-y-2.5 text-[0.95rem]">
            <li>
              <button onClick={() => update({ category: null })} className={cn("hover:text-gold-deep", !current && "font-medium text-ink underline decoration-gold underline-offset-4")}>
                All
              </button>
            </li>
            {categories.map((c) => (
              <li key={c.slug} className="flex justify-between">
                <button
                  onClick={() => update({ category: c.slug })}
                  className={cn("text-left text-charcoal hover:text-gold-deep", current === c.slug && "font-medium text-ink underline decoration-gold underline-offset-4")}
                  aria-pressed={current === c.slug}
                >
                  {c.name}
                </button>
                <span className="text-xs text-mist">{c.count}</span>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <fieldset>
        <legend className="eyebrow mb-4 text-charcoal">Price ({currencySymbol})</legend>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update({ min: min || null, max: max || null });
          }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="pmin">Minimum price</label>
            <input id="pmin" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder="Min" className="h-11 w-full border border-line bg-white px-3 text-sm focus:border-ink focus:outline-none" />
            <span className="text-mist">–</span>
            <label className="sr-only" htmlFor="pmax">Maximum price</label>
            <input id="pmax" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder="Max" className="h-11 w-full border border-line bg-white px-3 text-sm focus:border-ink focus:outline-none" />
          </div>
          <Button type="submit" variant="outline" size="sm" className="w-full">Apply price</Button>
        </form>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-4 text-charcoal">Availability</legend>
        <div className="space-y-2.5 text-[0.95rem]">
          {[
            { v: null, l: "All" },
            { v: "in-stock", l: "In stock" },
            { v: "out-of-stock", l: "Out of stock" },
          ].map((o) => (
            <label key={o.l} className="flex items-center gap-3">
              <input type="radio" name="availability" checked={(availability ?? null) === o.v} onChange={() => update({ availability: o.v })} className="size-4 accent-ink" />
              {o.l}
            </label>
          ))}
        </div>
      </fieldset>

      {(current || params.get("min") || params.get("max") || availability) && (
        <button onClick={() => update({ category: null, min: null, max: null, availability: null })} className="eyebrow text-stone underline underline-offset-4 hover:text-ink">
          Clear all filters
        </button>
      )}
    </div>
  );
}

const GRID_KEY = "rl_grid_cols";

function GridToggle() {
  const [cols, setCols] = useState<2 | 3 | 4>(3);
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(GRID_KEY));
      if (v === 2 || v === 3 || v === 4) setCols(v);
    } catch {}
  }, []);
  const set = (n: 2 | 3 | 4) => {
    setCols(n);
    try {
      localStorage.setItem(GRID_KEY, String(n));
    } catch {}
    window.dispatchEvent(new CustomEvent("rl-grid", { detail: n }));
  };
  return (
    <div className="hidden items-center gap-1 border-l border-line pl-4 lg:flex" role="group" aria-label="Grid size">
      {([2, 3, 4] as const).map((n) => (
        <button key={n} onClick={() => set(n)} aria-pressed={cols === n} aria-label={`${n} per row`} className={cn("p-1.5 transition-colors", cols === n ? "text-ink" : "text-mist hover:text-stone")}>
          <GridIcon cols={n} size={18} />
        </button>
      ))}
    </div>
  );
}

export function ProductGrid({ products, currency }: { products: ProductCardData[]; currency: string }) {
  const [cols, setCols] = useState<2 | 3 | 4>(3);
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(GRID_KEY));
      if (v === 2 || v === 3 || v === 4) setCols(v);
    } catch {}
    const on = (e: Event) => setCols((e as CustomEvent).detail);
    window.addEventListener("rl-grid", on);
    return () => window.removeEventListener("rl-grid", on);
  }, []);
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 md:grid-cols-3",
        cols === 2 && "lg:grid-cols-2",
        cols === 3 && "lg:grid-cols-3",
        cols === 4 && "lg:grid-cols-4",
      )}
    >
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} currency={currency} priority={i < 3} sizes={cols === 2 ? "(min-width:1024px) 40vw, 50vw" : undefined} />
      ))}
    </div>
  );
}

export function Pagination({ page, pages }: { page: number; pages: number }) {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pages <= 1) return null;
  const href = (p: number) => {
    const n = new URLSearchParams(params.toString());
    if (p === 1) n.delete("page");
    else n.set("page", String(p));
    return `${pathname}${n.size ? `?${n}` : ""}`;
  };
  return (
    <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn("grid size-10 place-items-center border text-sm transition-colors", p === page ? "border-ink bg-ink text-ivory" : "border-line hover:border-ink")}
        >
          {p}
        </Link>
      ))}
    </nav>
  );
}
