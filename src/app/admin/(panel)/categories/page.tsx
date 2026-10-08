import Image from "next/image";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { Card, PageHeader, Pill } from "@/components/admin/ui";
import { CategoryForm, CollectionForm, DeleteCategory, DeleteCollection } from "@/components/admin/category-forms";

export const metadata = { title: "Categories" };

export default async function CategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  await requireAdmin("products");
  const sp = await searchParams;
  const editId = typeof sp.edit === "string" ? sp.edit : "";
  const editCol = typeof sp.collection === "string" ? sp.collection : "";
  const [categories, collections] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { parent: { select: { name: true } }, _count: { select: { products: true } } } }),
    db.collection.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } }),
  ]);
  const editing = categories.find((c) => c.id === editId);
  const editingCol = collections.find((c) => c.id === editCol);

  return (
    <>
      <PageHeader title="Categories & collections" description="Categories group products by type (Body Oils, Scrubs…). Collections are curated edits (New Arrivals, Valentine's Edit) — a product can be in several." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card title="Categories">
          <ul className="-my-3 divide-y divide-line">
            {categories.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="relative size-12 shrink-0 overflow-hidden rounded bg-sand">{c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="48px" className="object-cover" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.name} {!c.isActive && <Pill>Hidden</Pill>}</p>
                  <p className="text-xs text-stone">{c.parent ? `Inside ${c.parent.name} · ` : ""}{c._count.products} products · /category/{c.slug}</p>
                </div>
                <a href={`?edit=${c.id}`} className="rounded-md border border-line px-3 py-1.5 text-xs hover:border-ink">Edit</a>
                <DeleteCategory id={c.id} name={c.name} count={c._count.products} />
              </li>
            ))}
          </ul>
        </Card>
        <Card title={editing ? `Edit “${editing.name}”` : "Add a category"}>
          <CategoryForm key={editing?.id ?? "new"} category={editing ?? null} parents={categories.filter((c) => !c.parentId && c.id !== editing?.id).map((c) => ({ id: c.id, name: c.name }))} />
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card title="Collections">
          {collections.length === 0 ? <p className="text-sm text-stone">No collections yet.</p> : (
            <ul className="-my-3 divide-y divide-line">
              {collections.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded bg-sand">{c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="48px" className="object-cover" />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.name} {!c.isActive && <Pill>Hidden</Pill>}</p>
                    <p className="text-xs text-stone">{c._count.products} products · /collections/{c.slug} — add products to it from each product&apos;s page.</p>
                  </div>
                  <a href={`?collection=${c.id}`} className="rounded-md border border-line px-3 py-1.5 text-xs hover:border-ink">Edit</a>
                  <DeleteCollection id={c.id} name={c.name} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={editingCol ? `Edit “${editingCol.name}”` : "Add a collection"}>
          <CollectionForm key={editingCol?.id ?? "new"} collection={editingCol ?? null} />
        </Card>
      </div>
    </>
  );
}
