import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Listing, parseFilters } from "@/components/store/listing";

async function load(slug: string) {
  return db.collection.findFirst({ where: { slug, isActive: true } });
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const c = await load((await params).slug);
  if (!c) return {};
  return {
    title: c.name,
    description: c.description ?? undefined,
    alternates: { canonical: `/collections/${c.slug}` },
    openGraph: c.imageUrl ? { images: [c.imageUrl] } : undefined,
  };
}

export default async function CollectionPage({ params, searchParams }: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const collection = await load(slug);
  if (!collection) notFound();
  const filters = { ...parseFilters(await searchParams), collection: slug };
  return (
    <>
      <section className="relative grid min-h-[320px] place-items-center overflow-hidden bg-ink px-6 py-20 text-center text-ivory sm:min-h-[420px]">
        {collection.imageUrl && <Image src={collection.imageUrl} alt="" fill sizes="100vw" className="object-cover opacity-40" />}
        <div className="relative max-w-2xl animate-fade-up">
          <p className="eyebrow text-champagne">Collection</p>
          <h1 className="mt-4 font-display text-5xl leading-tight sm:text-6xl">{collection.name}</h1>
          {collection.description && <p className="mt-5 text-mist">{collection.description}</p>}
        </div>
      </section>
      <div className="container-luxe py-14">
        <Listing filters={filters} />
      </div>
    </>
  );
}
