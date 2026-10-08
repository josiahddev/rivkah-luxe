import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Listing, parseFilters } from "@/components/store/listing";
import { SectionHeading } from "@/components/ui/bits";

async function load(slug: string) {
  return db.category.findFirst({
    where: { slug, isActive: true },
    include: { parent: { select: { name: true, slug: true } }, children: { where: { isActive: true }, select: { name: true, slug: true } } },
  });
}

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const c = await load((await params).slug);
  if (!c) return {};
  return {
    title: c.seoTitle ? { absolute: c.seoTitle } : c.name,
    description: c.seoDescription || c.description || undefined,
    alternates: { canonical: `/category/${c.slug}` },
    openGraph: c.imageUrl ? { images: [c.imageUrl] } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const category = await load(slug);
  if (!category) notFound();
  const filters = { ...parseFilters(await searchParams), category: slug };
  return (
    <div className="container-luxe py-14 sm:py-20">
      <nav aria-label="Breadcrumb" className="mb-8 text-xs text-stone">
        <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden="true">/</span>{" "}
        <Link href="/shop" className="hover:text-ink">Shop</Link> <span aria-hidden="true">/</span>{" "}
        {category.parent && (
          <>
            <Link href={`/category/${category.parent.slug}`} className="hover:text-ink">{category.parent.name}</Link> <span aria-hidden="true">/</span>{" "}
          </>
        )}
        <span className="text-ink" aria-current="page">{category.name}</span>
      </nav>
      <SectionHeading as="h1" eyebrow="Category" title={category.name} subtitle={category.description ?? undefined} className="mb-8" />
      {category.children.length > 0 && (
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {category.children.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className="border border-line px-4 py-2 text-sm hover:border-ink">
              {c.name}
            </Link>
          ))}
        </div>
      )}
      <Listing
        filters={filters}
        showCategories={false}
        emptyTitle="Nothing here just yet."
        emptyMessage="New pieces are on their way. Explore the full collection in the meantime."
      />
    </div>
  );
}
