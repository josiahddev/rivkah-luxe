import { Suspense } from "react";
import { db } from "@/lib/db";
import { listProducts, VISIBLE_STATUSES, type ListFilters, type SortKey } from "@/lib/catalog";
import { toMinor } from "@/lib/money";
import { getDisplayCurrency } from "@/lib/currency";
import { currencySymbol } from "@/lib/money";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/bits";
import { SearchIcon } from "@/components/ui/icons";
import { Pagination, ProductGrid, ShopFilters, ShopToolbar } from "./shop-controls";

export type RawParams = Record<string, string | string[] | undefined>;

export function parseFilters(sp: RawParams): ListFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));
  const num = (k: string) => {
    const v = one(k);
    return v && /^\d+$/.test(v) ? toMinor(Number(v)) : undefined;
  };
  const availability = one("availability");
  return {
    q: one("q")?.slice(0, 80),
    category: one("category"),
    sort: (one("sort") as SortKey) || "featured",
    min: num("min"),
    max: num("max"),
    availability: availability === "in-stock" || availability === "out-of-stock" ? availability : undefined,
    page: Number(one("page")) || 1,
    perPage: 12,
  };
}

export async function categoryCounts() {
  const cats = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    select: { name: true, slug: true, _count: { select: { products: { where: { status: { in: VISIBLE_STATUSES } } } } } },
  });
  return cats.map((c) => ({ name: c.name, slug: c.slug, count: c._count.products }));
}

export async function Listing({ filters, showCategories = true, emptyTitle, emptyMessage }: { filters: ListFilters; showCategories?: boolean; emptyTitle?: string; emptyMessage?: string }) {
  const cur = await getDisplayCurrency();
  // Price filters are typed in the shopper's currency; products are stored in the base currency.
  const baseFilters = {
    ...filters,
    min: filters.min !== undefined ? Math.floor(filters.min / cur.rate) : undefined,
    max: filters.max !== undefined ? Math.ceil(filters.max / cur.rate) : undefined,
  };
  const [{ products, total, page, pages }, cats] = await Promise.all([listProducts(baseFilters), categoryCounts()]);
  const symbol = currencySymbol(cur.code).trim();
  return (
    <Suspense>
      <ShopToolbar total={total} categories={cats} showCategories={showCategories} currencySymbol={symbol} />
      <div className="mt-10 grid gap-12 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-28">
            <ShopFilters categories={cats} showCategories={showCategories} currencySymbol={symbol} />
          </div>
        </aside>
        <div>
          {products.length === 0 ? (
            <EmptyState
              icon={<SearchIcon size={26} />}
              title={emptyTitle ?? "We couldn't find what you're looking for."}
              message={emptyMessage ?? "Try removing a filter or searching for something else."}
            >
              <ButtonLink href="/shop" variant="outline">
                View all products
              </ButtonLink>
            </EmptyState>
          ) : (
            <>
              <ProductGrid products={products} currency={cur.code} />
              <Pagination page={page} pages={pages} />
            </>
          )}
        </div>
      </div>
    </Suspense>
  );
}
