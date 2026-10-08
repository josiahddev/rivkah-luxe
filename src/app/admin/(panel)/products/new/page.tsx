import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui";
import { emptyVariant, ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireAdmin("products");
  const [categories, collections, settings] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, parentId: true } }),
    db.collection.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader title="Add a product" description="Fill in what you know — you can always come back and change it." back={{ href: "/admin/products", label: "Products" }} />
      <ProductForm
        currency={settings.currency}
        siteUrl={siteUrl()}
        categories={categories}
        collections={collections}
        initial={{
          name: "", slug: "", sku: "", categoryId: "", subcategoryId: "", shortDescription: "", description: "", ingredients: "", benefits: "",
          howToUse: "", size: "", dimensions: "", videoUrl: "", tags: "", status: "PUBLISHED", isFeatured: false, seoTitle: "", seoDescription: "",
          collections: [], images: [], variants: [emptyVariant()],
        }}
      />
    </>
  );
}
