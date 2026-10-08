import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { minorToInput } from "@/lib/money";
import { siteUrl } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { ProductActions } from "@/components/admin/product-actions";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdmin("products");
  const { id } = await params;
  const [p, categories, collections, settings] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: "asc" } }, variants: { orderBy: { sortOrder: "asc" } }, collections: { select: { id: true } } },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, parentId: true } }),
    db.collection.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    getSettings(),
  ]);
  if (!p) notFound();
  return (
    <>
      <PageHeader
        title={p.name}
        description={p.isDemo ? "This is a demo product. Edit it or delete it before launch." : "Change anything below, then press Save."}
        back={{ href: "/admin/products", label: "Products" }}
        actions={
          <>
            <Link href={`/products/${p.slug}`} target="_blank" className="rounded-md border border-line bg-white px-4 py-2.5 text-sm hover:border-ink">View in shop ↗</Link>
            <ProductActions id={p.id} name={p.name} />
          </>
        }
      />
      <ProductForm
        key={p.updatedAt.toISOString()}
        currency={settings.currency}
        siteUrl={siteUrl()}
        categories={categories}
        collections={collections}
        initial={{
          id: p.id, name: p.name, slug: p.slug, sku: p.sku, categoryId: p.categoryId ?? "", subcategoryId: p.subcategoryId ?? "",
          shortDescription: p.shortDescription ?? "", description: p.description ?? "", ingredients: p.ingredients ?? "", benefits: p.benefits ?? "",
          howToUse: p.howToUse ?? "", size: p.size ?? "", dimensions: p.dimensions ?? "", videoUrl: p.videoUrl ?? "", tags: p.tags.join(", "),
          status: p.status, isFeatured: p.isFeatured, seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "",
          collections: p.collections.map((c) => c.id),
          images: p.images.map((i) => ({ url: i.url, alt: i.alt ?? "" })),
          variants: p.variants.map((v) => ({
            id: v.id, name: v.name, optionType: v.optionType, sku: v.sku, price: minorToInput(v.price), salePrice: minorToInput(v.salePrice),
            costPrice: minorToInput(v.costPrice), stock: v.stock, lowStockThreshold: v.lowStockThreshold, weightGrams: v.weightGrams, imageUrl: v.imageUrl, isActive: v.isActive,
          })),
        }}
      />
    </>
  );
}
