import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { effectivePrice } from "@/lib/catalog";
import { AdminEmpty, FilterBar, FilterField, filterInput, PageHeader, Pager } from "@/components/admin/ui";
import { ProductTable } from "@/components/admin/product-table";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Products" };
const PER_PAGE = 25;

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin("products");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.ProductWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }, { variants: { some: { sku: { contains: q, mode: "insensitive" } } } }] } : {}),
    ...(status ? { status: status as Prisma.ProductWhereInput["status"] } : {}),
    ...(category ? { categoryId: category } : {}),
  };
  const [products, total, categories, settings, demoCount] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { category: { select: { name: true } }, images: { take: 1, orderBy: { sortOrder: "asc" } }, variants: { orderBy: { sortOrder: "asc" } } },
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    getSettings(),
    db.product.count({ where: { isDemo: true } }),
  ]);

  const rows = products.map((p) => ({
    id: p.id,
    name: p.name,
    image: p.images[0]?.url ?? p.variants[0]?.imageUrl ?? null,
    category: p.category?.name ?? null,
    status: p.status,
    isFeatured: p.isFeatured,
    isDemo: p.isDemo,
    slug: p.slug,
    price: p.variants.length ? Math.min(...p.variants.map(effectivePrice)) : 0,
    priceRange: new Set(p.variants.map(effectivePrice)).size > 1,
    stock: p.variants.reduce((s, v) => s + v.stock, 0),
    low: p.variants.some((v) => v.isActive && v.stock <= v.lowStockThreshold),
    variants: p.variants.length,
    sold: p.soldCount,
  }));

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything you sell. Click a product to change its photos, price or stock."
        actions={<Link href="/admin/products/new" className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-ivory hover:bg-ink-soft">+ Add product</Link>}
      />
      {demoCount > 0 && (
        <div className="mb-5 rounded-lg border border-gold/50 bg-champagne/15 p-4 text-sm">
          <strong className="font-medium">{demoCount} demo products</strong> are here so you can see how the store works. They&apos;re marked “Demo”. Delete them (or ask your developer to run <code className="rounded bg-white px-1">npm run db:remove-demo</code>) before you launch.
        </div>
      )}
      <FilterBar>
        <FilterField label="Search">
          <input name="q" defaultValue={q} placeholder="Name or SKU" className={filterInput} />
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={status} className={filterInput}>
            <option value="">All</option>
            <option value="PUBLISHED">Live</option>
            <option value="DRAFT">Draft</option>
            <option value="OUT_OF_STOCK">Out of stock</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </FilterField>
        <FilterField label="Category">
          <select name="category" defaultValue={category} className={filterInput}>
            <option value="">All</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FilterField>
        <button className="h-10 rounded-md bg-ink px-5 text-sm font-medium text-ivory">Filter</button>
        {(q || status || category) && <Link href="/admin/products" className="h-10 px-2 text-sm leading-10 text-stone underline">Clear</Link>}
      </FilterBar>
      {rows.length === 0 ? (
        <AdminEmpty
          title={q || status || category ? "No products match." : "No products yet."}
          message={q || status || category ? "Try a different search or clear the filters." : "Add your first product — it only takes a couple of minutes."}
          action={<Link href="/admin/products/new" className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-ivory">+ Add product</Link>}
        />
      ) : (
        <ProductTable rows={rows} categories={categories} currency={settings.currency} />
      )}
      <Pager page={page} pages={Math.ceil(total / PER_PAGE)} params={{ q, status, category }} />
    </>
  );
}
