import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { alsoViewed, boughtTogether, effectivePrice, VISIBLE_STATUSES } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { siteUrl, stripHtml } from "@/lib/utils";
import { convert, formatMoney } from "@/lib/money";
import { getDisplayCurrency } from "@/lib/currency";
import { ProductHero } from "@/components/store/product-purchase";
import { AddAllToBag } from "@/components/store/product-purchase";
import { ProductCard } from "@/components/store/product-card";
import { RecentlyViewed, TrackView } from "@/components/store/recently-viewed";
import { ReviewForm } from "@/components/store/review-form";
import { WhatsAppInline } from "@/components/store/whatsapp-button";
import { Badge, SectionHeading, Stars } from "@/components/ui/bits";
import { CheckIcon, PlusIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils";

const load = cache(async (slug: string) =>
  db.product.findFirst({
    where: { slug, status: { in: VISIBLE_STATUSES } },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }] },
    },
  }),
);

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return { title: "Product not found" };
  const description = p.seoDescription || p.shortDescription || stripHtml(p.description).slice(0, 160);
  return {
    title: p.seoTitle ? { absolute: p.seoTitle } : p.name,
    description,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { type: "website", title: p.seoTitle || p.name, description, images: p.images.slice(0, 1).map((i) => ({ url: i.url, alt: i.alt || p.name })) },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();

  const [settings, zones, reviews, distribution, together, viewed, user, cur] = await Promise.all([
    getSettings(),
    db.shippingZone.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.review.findMany({ where: { productId: p.id, status: "APPROVED" }, orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }], take: 20 }),
    db.review.groupBy({ by: ["rating"], where: { productId: p.id, status: "APPROVED" }, _count: true }),
    boughtTogether(p.id, p.categoryId, 2),
    alsoViewed(p.id, p.categoryId, 4),
    getCurrentUser(),
    getDisplayCurrency(),
  ]);
  const c = cur.code;

  const variants = p.variants.map((v) => ({
    id: v.id,
    name: v.name,
    price: convert(effectivePrice(v), cur),
    compareAt: effectivePrice(v) < v.price ? convert(v.price, cur) : null,
    stock: v.stock,
    imageUrl: v.imageUrl,
    lowStockThreshold: v.lowStockThreshold,
  }));
  const images = p.images.length ? p.images.map((i) => ({ url: i.url, alt: i.alt })) : variants.filter((v) => v.imageUrl).map((v) => ({ url: v.imageUrl!, alt: p.name }));
  const anyStock = p.status !== "OUT_OF_STOCK" && variants.some((v) => v.stock > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.seoDescription || p.shortDescription || stripHtml(p.description),
    sku: p.sku,
    image: images.map((i) => (i.url.startsWith("http") ? i.url : siteUrl(i.url))),
    brand: { "@type": "Brand", name: settings.storeName },
    category: p.category?.name,
    offers: p.variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      name: v.name,
      price: (effectivePrice(v) / 100).toFixed(2),
      priceCurrency: settings.currency,
      availability: v.stock > 0 && p.status !== "OUT_OF_STOCK" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: siteUrl(`/products/${p.slug}`),
      itemCondition: "https://schema.org/NewCondition",
    })),
    ...(p.reviewCount > 0
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg, reviewCount: p.reviewCount },
          review: reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating },
            author: { "@type": "Person", name: r.name },
            name: r.title ?? undefined,
            reviewBody: r.comment,
            datePublished: r.createdAt.toISOString().slice(0, 10),
          })),
        }
      : {}),
  };

  const details: { title: string; body: React.ReactNode }[] = [];
  if (p.description) details.push({ title: "Description", body: <div className="prose-luxe" dangerouslySetInnerHTML={{ __html: p.description }} /> });
  if (p.benefits)
    details.push({
      title: "Benefits",
      body: (
        <ul className="space-y-2">
          {p.benefits.split("\n").filter(Boolean).map((b) => (
            <li key={b} className="flex gap-3"><CheckIcon size={18} className="mt-0.5 shrink-0 text-gold-deep" />{b}</li>
          ))}
        </ul>
      ),
    });
  if (p.ingredients) details.push({ title: "Ingredients", body: <p className="leading-relaxed">{p.ingredients}</p> });
  if (p.howToUse) details.push({ title: "How to use", body: <p className="whitespace-pre-line leading-relaxed">{p.howToUse}</p> });
  details.push({
    title: "Shipping & returns",
    body: (
      <div className="space-y-3">
        <p>We ship worldwide from Canada. Shipping fees, delivery times and any sales tax are confirmed at checkout. International orders may be subject to import duties. {settings.returnsSummary}</p>
        <p>
          <Link href="/shipping-delivery" className="underline underline-offset-4">Shipping policy</Link> ·{" "}
          <Link href="/returns-refunds" className="underline underline-offset-4">Returns policy</Link>
        </p>
        {settings.whatsapp && <WhatsAppInline number={settings.whatsapp} message={`Hello, I have a question about ${p.name}.`} label="Questions? Chat with us on WhatsApp" />}
      </div>
    ),
  });

  const togetherSet = together.filter((t) => t.inStock && t.defaultVariantId);
  const defaultVariant = variants.find((v) => v.stock > 0);
  const togetherTotal = (defaultVariant?.price ?? 0) + togetherSet.reduce((s, t) => s + t.price, 0);
  const counts = Object.fromEntries(distribution.map((d) => [d.rating, d._count]));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <TrackView productId={p.id} />

      <div className="container-luxe pb-16 pt-8 sm:pt-12">
        <nav aria-label="Breadcrumb" className="mb-8 text-xs text-stone">
          <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden="true">/</span>{" "}
          <Link href="/shop" className="hover:text-ink">Shop</Link> <span aria-hidden="true">/</span>{" "}
          {p.category && (
            <>
              <Link href={`/category/${p.category.slug}`} className="hover:text-ink">{p.category.name}</Link> <span aria-hidden="true">/</span>{" "}
            </>
          )}
          <span className="text-ink" aria-current="page">{p.name}</span>
        </nav>

        <ProductHero
          product={{
            id: p.id,
            name: p.name,
            slug: p.slug,
            shortDescription: p.shortDescription,
            rating: p.ratingAvg,
            reviewCount: p.reviewCount,
            category: p.category?.name ?? null,
            videoUrl: p.videoUrl,
            optionType: p.variants[0]?.optionType ?? "Size",
            size: p.size,
            manualOutOfStock: p.status === "OUT_OF_STOCK",
          }}
          variants={variants}
          images={images}
          zones={zones.map((z) => ({ name: z.name, fee: convert(z.fee, cur), freeOverAmount: z.freeOverAmount ? convert(z.freeOverAmount, cur) : null, estimatedDelivery: z.estimatedDelivery }))}
          currency={c}
          returnsSummary={settings.returnsSummary}
        />

        {/* Details */}
        <section className="mx-auto mt-20 max-w-3xl" aria-label="Product details">
          {details.map((d, i) => (
            <details key={d.title} className="accordion border-b border-line" open={i === 0}>
              <summary className="flex items-center justify-between py-5">
                <h2 className="font-display text-2xl">{d.title}</h2>
                <PlusIcon size={20} className="accordion-icon text-stone" />
              </summary>
              <div className="accordion-body">
                <div>
                  <div className="pb-6 text-[0.95rem] text-charcoal">{d.body}</div>
                </div>
              </div>
            </details>
          ))}
        </section>
      </div>

      {/* Frequently bought together */}
      {anyStock && togetherSet.length > 0 && defaultVariant && (
        <section className="bg-cream py-16 sm:py-20" aria-labelledby="fbt-heading">
          <div className="container-luxe">
            <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow mb-3 text-gold-deep">Complete the ritual</p>
                <h2 id="fbt-heading" className="font-display text-4xl">Frequently bought together</h2>
              </div>
              <div className="flex items-center gap-5">
                <p className="text-sm text-stone">
                  Together: <span className="text-lg text-ink">{formatMoney(togetherTotal, c)}</span>
                </p>
                <AddAllToBag variantIds={[defaultVariant.id, ...togetherSet.map((t) => t.defaultVariantId!)]} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
              {togetherSet.map((t) => (
                <ProductCard key={t.id} product={t} currency={c} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      <section id="reviews" className="container-luxe scroll-mt-28 py-20" aria-labelledby="reviews-heading">
        <div className="grid gap-12 lg:grid-cols-[320px_1fr] lg:gap-20">
          <div>
            <h2 id="reviews-heading" className="font-display text-4xl">Reviews</h2>
            {p.reviewCount > 0 ? (
              <>
                <div className="mt-6 flex items-end gap-3">
                  <span className="font-display text-6xl leading-none">{p.ratingAvg.toFixed(1)}</span>
                  <div className="pb-1">
                    <Stars value={p.ratingAvg} size={16} />
                    <p className="mt-1 text-xs text-stone">{p.reviewCount} {p.reviewCount === 1 ? "review" : "reviews"}</p>
                  </div>
                </div>
                <dl className="mt-6 space-y-2">
                  {[5, 4, 3, 2, 1].map((n) => {
                    const count = counts[n] ?? 0;
                    const pct = p.reviewCount ? Math.round((count / p.reviewCount) * 100) : 0;
                    return (
                      <div key={n} className="flex items-center gap-3 text-xs">
                        <dt className="w-10 text-stone">{n} star</dt>
                        <dd className="flex flex-1 items-center gap-3">
                          <span className="h-1 flex-1 bg-sand"><span className="block h-full bg-gold" style={{ width: `${pct}%` }} /></span>
                          <span className="w-6 text-right text-stone">{count}</span>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </>
            ) : (
              <p className="mt-4 text-stone">No reviews yet. Tried it? We&apos;d love to hear what you think.</p>
            )}
            <div className="mt-8">
              <ReviewForm productId={p.id} defaultName={user?.name} defaultEmail={user?.email} />
            </div>
          </div>
          <div>
            {reviews.length === 0 ? null : (
              <ul className="divide-y divide-line border-y border-line">
                {reviews.map((r) => (
                  <li key={r.id} className="py-8">
                    <div className="flex flex-wrap items-center gap-3">
                      <Stars value={r.rating} />
                      {r.verifiedPurchase && <Badge tone="green"><CheckIcon size={12} /> Verified purchase</Badge>}
                    </div>
                    {r.title && <p className="mt-3 font-display text-2xl">{r.title}</p>}
                    <p className="mt-2 leading-relaxed text-charcoal">{r.comment}</p>
                    <p className="mt-4 text-xs text-stone">
                      {r.name}
                      {r.location && ` · ${r.location}`} · {formatDate(r.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Customers also viewed */}
      {viewed.length > 0 && (
        <section className="container-luxe py-16" aria-label="Customers also viewed">
          <SectionHeading title="Customers also viewed" align="left" className="mb-10" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {viewed.map((v) => (
              <ProductCard key={v.id} product={v} currency={c} />
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed excludeId={p.id} currency={c} />
    </>
  );
}
