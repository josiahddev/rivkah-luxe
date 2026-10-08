import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { VISIBLE_STATUSES } from "@/lib/catalog";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, collections, pages] = await Promise.all([
    db.product.findMany({ where: { status: { in: VISIBLE_STATUSES } }, select: { slug: true, updatedAt: true, images: { take: 1, select: { url: true } } } }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    db.collection.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    db.page.findMany({ select: { slug: true, updatedAt: true } }),
  ]);
  const abs = (u: string) => (u.startsWith("http") ? u : siteUrl(u));
  return [
    { url: siteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/shop"), changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/faq"), changeFrequency: "monthly", priority: 0.4 },
    { url: siteUrl("/contact"), changeFrequency: "yearly", priority: 0.4 },
    { url: siteUrl("/track-order"), changeFrequency: "yearly", priority: 0.3 },
    ...products.map((p) => ({ url: siteUrl(`/products/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8, images: p.images.map((i) => abs(i.url)) })),
    ...categories.map((c) => ({ url: siteUrl(`/category/${c.slug}`), lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...collections.map((c) => ({ url: siteUrl(`/collections/${c.slug}`), lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...pages.map((p) => ({ url: siteUrl(`/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.4 })),
  ];
}
