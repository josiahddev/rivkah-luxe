import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { formatDate, stripHtml } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";

// Every editable page (About, Shipping, Returns, Privacy, Terms, Cookies, and
// any page the owner adds) is served from the database through this route.
const load = cache((slug: string) => db.page.findUnique({ where: { slug } }));

export async function generateMetadata({ params }: PageProps<"/[page]">): Promise<Metadata> {
  const p = await load((await params).page);
  if (!p) return {};
  return {
    title: p.seoTitle ? { absolute: p.seoTitle } : p.title,
    description: p.seoDescription || stripHtml(p.body).slice(0, 160),
    alternates: { canonical: `/${p.slug}` },
  };
}

export default async function ContentPage({ params }: PageProps<"/[page]">) {
  const { page } = await params;
  const p = await load(page);
  if (!p) notFound();
  const isAbout = p.slug === "about";
  return (
    <>
      {isAbout && (
        <section className="relative grid min-h-[380px] place-items-center overflow-hidden bg-ink px-6 py-24 text-center text-ivory">
          <Image src="/demo/hero-packaging.webp" alt="" fill sizes="100vw" className="object-cover opacity-35" preload />
          <div className="relative animate-fade-up">
            <p className="eyebrow text-champagne">Our story</p>
            <h1 className="mt-4 font-display text-5xl sm:text-6xl">{p.title}</h1>
          </div>
        </section>
      )}
      <article className="container-luxe py-14 sm:py-20">
        <div className="mx-auto max-w-2xl">
          {!isAbout && (
            <header className="mb-12 border-b border-line pb-8">
              <h1 className="font-display text-5xl leading-tight">{p.title}</h1>
              <p className="mt-3 text-xs text-stone">Last updated {formatDate(p.updatedAt, { dateStyle: "long" })}</p>
            </header>
          )}
          <div className="prose-luxe" dangerouslySetInnerHTML={{ __html: p.body }} />
          {isAbout && (
            <div className="mt-14 flex flex-wrap gap-3">
              <ButtonLink href="/shop">Shop the collection</ButtonLink>
              <ButtonLink href="/contact" variant="outline">Get in touch</ButtonLink>
            </div>
          )}
        </div>
      </article>
    </>
  );
}
