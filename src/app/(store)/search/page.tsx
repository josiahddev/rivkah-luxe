import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Listing, parseFilters } from "@/components/store/listing";
import { SearchForm } from "@/components/store/search-form";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const filters = parseFilters(await searchParams);
  const q = filters.q?.trim() ?? "";
  if (q.length >= 2) {
    const term = q.toLowerCase().slice(0, 60);
    await db.searchQuery.upsert({ where: { term }, create: { term }, update: { count: { increment: 1 } } }).catch(() => {});
  }
  return (
    <div className="container-luxe py-14 sm:py-20">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="eyebrow mb-3 text-gold-deep">Search</p>
        <h1 className="font-display text-4xl sm:text-5xl">{q ? <>Results for &ldquo;{q}&rdquo;</> : "Search our collection"}</h1>
        <div className="mt-8">
          <SearchForm defaultValue={q} />
        </div>
      </div>
      {q && (
        <Listing
          filters={filters}
          emptyTitle="We couldn't find what you're looking for."
          emptyMessage="Check the spelling or try a broader word like “oil”, “scrub” or “gift”."
        />
      )}
    </div>
  );
}
