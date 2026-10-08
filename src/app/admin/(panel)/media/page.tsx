import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { FilterBar, FilterField, filterInput, PageHeader } from "@/components/admin/ui";
import { MediaGrid, MediaUpload } from "@/components/admin/media-library";

export const metadata = { title: "Photos" };

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  await requireAdmin("media");
  const q = (await searchParams).q;
  const term = typeof q === "string" ? q.trim() : "";
  const assets = await db.mediaAsset.findMany({
    where: term ? { OR: [{ filename: { contains: term, mode: "insensitive" } }, { alt: { contains: term, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const urls = assets.map((a) => a.url);
  // Where each photo is used.
  const [productImgs, variants, categories, collections, promos, sections] = await Promise.all([
    db.productImage.findMany({ where: { url: { in: urls } }, select: { url: true, product: { select: { name: true, id: true } } } }),
    db.productVariant.findMany({ where: { imageUrl: { in: urls } }, select: { imageUrl: true, product: { select: { name: true, id: true } } } }),
    db.category.findMany({ where: { imageUrl: { in: urls } }, select: { imageUrl: true, name: true } }),
    db.collection.findMany({ where: { imageUrl: { in: urls } }, select: { imageUrl: true, name: true } }),
    db.promotion.findMany({ where: { imageUrl: { in: urls } }, select: { imageUrl: true, name: true } }),
    db.homepageSection.findMany(),
  ]);
  const usage = new Map<string, { label: string; href: string }[]>();
  const add = (url: string | null, label: string, href: string) => {
    if (!url) return;
    const list = usage.get(url) ?? [];
    if (!list.some((l) => l.label === label)) list.push({ label, href });
    usage.set(url, list);
  };
  productImgs.forEach((p) => add(p.url, p.product.name, `/admin/products/${p.product.id}`));
  variants.forEach((v) => add(v.imageUrl, v.product.name, `/admin/products/${v.product.id}`));
  categories.forEach((c) => add(c.imageUrl, `Category: ${c.name}`, "/admin/categories"));
  collections.forEach((c) => add(c.imageUrl, `Collection: ${c.name}`, "/admin/categories"));
  promos.forEach((p) => add(p.imageUrl, `Promotion: ${p.name}`, "/admin/promotions"));
  for (const s of sections) {
    const json = JSON.stringify(s.data);
    for (const u of urls) if (json.includes(u)) add(u, `Homepage: ${s.key}`, "/admin/content/homepage");
  }

  return (
    <>
      <PageHeader title="Photos" description="Every photo you've uploaded. Reuse them on any product or page. Large photos are resized automatically so your site stays fast." />
      <MediaUpload />
      <FilterBar>
        <FilterField label="Search"><input name="q" defaultValue={term} placeholder="File name or description" className={filterInput} /></FilterField>
        <button className="h-10 rounded-md bg-ink px-5 text-sm font-medium text-ivory">Search</button>
      </FilterBar>
      <MediaGrid items={assets.map((a) => ({ id: a.id, url: a.url, filename: a.filename, alt: a.alt ?? "", size: a.size, width: a.width, height: a.height, usedIn: usage.get(a.url) ?? [] }))} />
    </>
  );
}
