import Image from "next/image";
import { BrandLogo } from "@/components/store/logo";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSections, getSettings } from "@/lib/settings";
import { productRow } from "@/lib/catalog";
import { activePromotions } from "@/lib/promotions";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading, Stars } from "@/components/ui/bits";
import { Reveal } from "@/components/ui/reveal";
import { ArrowRight, InstagramIcon } from "@/components/ui/icons";
import { ProductCard } from "@/components/store/product-card";
import { NewsletterForm } from "@/components/store/newsletter-form";
import { RecentlyViewed } from "@/components/store/recently-viewed";
import type { ProductCardData } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, sections, promos] = await Promise.all([getSettings(), getSections(), activePromotions()]);
  const [featured, best, fresh, categories, testimonials] = await Promise.all([
    sections.featured.isVisible ? productRow("featured", sections.featured.count) : [],
    sections.bestSellers.isVisible ? productRow("best", sections.bestSellers.count) : [],
    sections.newArrivals.isVisible ? productRow("new", sections.newArrivals.count) : [],
    sections.categories.isVisible
      ? db.category.findMany({ where: { isActive: true, showOnHomepage: true, parentId: null }, orderBy: { sortOrder: "asc" }, take: 6 })
      : [],
    sections.testimonials.isVisible
      ? db.review.findMany({ where: { status: "APPROVED", isFeatured: true }, orderBy: { createdAt: "desc" }, take: 6, include: { product: { select: { name: true, slug: true } } } })
      : [],
  ]);

  const heroPromo = promos.find((p) => p.showAsHero);
  const bannerPromo = promos.find((p) => p.showAsBanner);
  const hero = heroPromo
    ? {
        ...sections.hero,
        mediaType: "image" as const,
        imageUrl: heroPromo.imageUrl || sections.hero.imageUrl,
        eyebrow: heroPromo.discountText || sections.hero.eyebrow,
        heading: heroPromo.headline,
        subheading: heroPromo.subheading || "",
        ctaText: heroPromo.ctaText || sections.hero.ctaText,
        ctaLink: heroPromo.ctaLink || (heroPromo.collection ? `/collections/${heroPromo.collection.slug}` : sections.hero.ctaLink),
      }
    : sections.hero;
  const banner = bannerPromo
    ? {
        imageUrl: bannerPromo.imageUrl || sections.promoBanner.imageUrl,
        eyebrow: bannerPromo.discountText || bannerPromo.name,
        heading: bannerPromo.headline,
        text: bannerPromo.subheading || "",
        ctaText: bannerPromo.ctaText || "Shop now",
        ctaLink: bannerPromo.ctaLink || (bannerPromo.collection ? `/collections/${bannerPromo.collection.slug}` : "/shop"),
        isVisible: true,
      }
    : sections.promoBanner;
  const c = settings.currency;

  return (
    <>
      {/* 1. Hero */}
      {sections.hero.isVisible && (
        <section className="relative bg-ink text-ivory" aria-label="Welcome">
          <div className="grid lg:min-h-[calc(100dvh-7.5rem)] lg:grid-cols-[1fr_1.05fr]">
            <div className="relative order-2 flex items-center px-6 py-14 sm:px-10 lg:order-1 lg:px-16 lg:py-20 xl:px-24">
              <div className="max-w-xl animate-fade-up">
                {hero.eyebrow && <p className="eyebrow mb-6 text-champagne">{hero.eyebrow}</p>}
                <h1 className="font-display text-[2.9rem] leading-[1.02] sm:text-6xl xl:text-[5.2rem]">{hero.heading}</h1>
                {hero.subheading && <p className="mt-6 max-w-md text-[1.02rem] leading-relaxed text-mist">{hero.subheading}</p>}
                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  {hero.ctaText && (
                    <ButtonLink href={hero.ctaLink || "/shop"} variant="gold" size="lg">
                      {hero.ctaText}
                    </ButtonLink>
                  )}
                  {hero.secondaryCtaText && (
                    <ButtonLink href={hero.secondaryCtaLink || "/about"} variant="light" size="lg">
                      {hero.secondaryCtaText}
                    </ButtonLink>
                  )}
                </div>
              </div>
              <div className="pointer-events-none absolute bottom-8 left-6 hidden items-center gap-3 text-[0.65rem] uppercase tracking-[0.3em] text-mist sm:left-10 lg:left-16 lg:flex xl:left-24">
                <span className="h-px w-10 bg-gold/60" /> Glow in luxury
              </div>
            </div>
            <div className="relative order-1 aspect-[4/5] overflow-hidden sm:aspect-[16/11] lg:order-2 lg:aspect-auto">
              {hero.mediaType === "video" && hero.videoUrl ? (
                <video className="absolute inset-0 h-full w-full object-cover" src={hero.videoUrl} poster={hero.imageUrl || undefined} autoPlay muted loop playsInline aria-hidden="true" />
              ) : hero.imageUrl ? (
                <Image src={hero.imageUrl} alt="Rivkah Luxe" fill preload sizes="(min-width:1024px) 52vw, 100vw" className="object-cover animate-fade-in" quality={85} />
              ) : (
                <div className="absolute inset-0 bg-charcoal" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/30 via-transparent to-transparent lg:bg-gradient-to-r lg:from-ink/25" />
            </div>
          </div>
        </section>
      )}

      {/* Trust strip */}
      <section className="border-b border-line bg-cream" aria-label="Why shop with us">
        <div className="container-luxe grid grid-cols-2 gap-y-4 py-5 text-center text-[0.7rem] uppercase tracking-[0.16em] text-charcoal md:grid-cols-4">
          <p>Small-batch blends</p>
          <p>Shipping worldwide</p>
          <p>Secure payment</p>
          <p>Gift-ready packaging</p>
        </div>
      </section>

      {/* 2. Featured */}
      {featured.length > 0 && (
        <ProductSection title={sections.featured.heading} subtitle={sections.featured.subheading} eyebrow="Curated" products={featured} currency={c} href="/shop" priority />
      )}

      {/* 3. Categories */}
      {categories.length > 0 && (
        <section className="bg-cream py-20 sm:py-28" aria-labelledby="cat-heading">
          <div className="container-luxe">
            <Reveal>
              <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="eyebrow mb-3 text-gold-deep">Categories</p>
                  <h2 id="cat-heading" className="font-display text-[2.1rem] leading-[1.1] sm:text-5xl">{sections.categories.heading}</h2>
                </div>
                <Link href="/shop" className="eyebrow inline-flex items-center gap-2 hover:text-gold-deep">
                  Shop all <ArrowRight size={16} />
                </Link>
              </div>
            </Reveal>
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-6">
              {categories.map((cat, i) => (
                <Reveal key={cat.id} delay={i * 70} className="w-[62vw] shrink-0 snap-start sm:w-auto">
                  <Link href={`/category/${cat.slug}`} className="group block">
                    <div className="relative aspect-[3/4] overflow-hidden bg-sand">
                      {cat.imageUrl && <Image src={cat.imageUrl} alt="" fill sizes="(min-width:1024px) 16vw, (min-width:640px) 33vw, 62vw" className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-luxe)] group-hover:scale-105" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/0 to-transparent" />
                      <p className="absolute inset-x-0 bottom-0 p-4 font-display text-xl text-ivory">{cat.name}</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
              <Reveal delay={categories.length * 70} className="w-[62vw] shrink-0 snap-start sm:w-auto">
                <Link href="/shop?sort=newest" className="group grid aspect-[3/4] place-items-center border border-gold/50 bg-ink p-6 text-center text-ivory">
                  <div>
                    <p className="eyebrow text-champagne">Just in</p>
                    <p className="mt-3 font-display text-3xl italic">New Arrivals</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.2em] text-mist group-hover:text-ivory">
                      Discover <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* 6. Best sellers */}
      {best.length > 0 && (
        <ProductSection title={sections.bestSellers.heading} subtitle={sections.bestSellers.subheading} eyebrow="Most loved" products={best} currency={c} href="/shop?sort=best-selling" />
      )}

      {/* 8. Promotional banner */}
      {banner.isVisible && banner.heading && (
        <section className="container-luxe py-6" aria-label="Promotion">
          <Reveal>
            <div className="relative grid overflow-hidden bg-ink text-ivory md:grid-cols-2">
              <div className="relative aspect-[16/11] md:order-2 md:aspect-auto md:min-h-[460px]">
                {banner.imageUrl && <Image src={banner.imageUrl} alt="" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />}
              </div>
              <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
                {banner.eyebrow && <p className="eyebrow mb-4 text-champagne">{banner.eyebrow}</p>}
                <h2 className="font-display text-4xl leading-[1.05] sm:text-5xl">{banner.heading}</h2>
                {banner.text && <p className="mt-5 max-w-md leading-relaxed text-mist">{banner.text}</p>}
                {banner.ctaText && (
                  <div className="mt-8">
                    <ButtonLink href={banner.ctaLink || "/shop"} variant="gold">
                      {banner.ctaText}
                    </ButtonLink>
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* 7. New arrivals */}
      {fresh.length > 0 && (
        <ProductSection title={sections.newArrivals.heading} subtitle={sections.newArrivals.subheading} eyebrow="Fresh" products={fresh} currency={c} href="/shop?sort=newest" />
      )}

      {/* 9. Brand story */}
      {sections.brandStory.isVisible && (
        <section className="py-20 sm:py-28" aria-labelledby="story-heading">
          <div className="container-luxe grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <Reveal className="relative">
              <div className="relative aspect-[4/5] overflow-hidden bg-sand">
                {sections.brandStory.imageUrl && <Image src={sections.brandStory.imageUrl} alt="" fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" />}
              </div>
              <div className="absolute -bottom-6 -right-2 hidden border border-gold/50 bg-ink px-6 py-5 sm:block lg:-right-10">
                <BrandLogo className="h-20" />
              </div>
            </Reveal>
            <Reveal delay={120}>
              <p className="eyebrow mb-4 text-gold-deep">{sections.brandStory.eyebrow}</p>
              <h2 id="story-heading" className="font-display text-[2.4rem] leading-[1.08] sm:text-[3.4rem]">
                {sections.brandStory.heading}
              </h2>
              <p className="mt-6 max-w-lg text-[1.02rem] leading-[1.85] text-charcoal">{sections.brandStory.body}</p>
              {sections.brandStory.ctaText && (
                <ButtonLink href={sections.brandStory.ctaLink || "/about"} variant="outline" className="mt-10">
                  {sections.brandStory.ctaText}
                </ButtonLink>
              )}
            </Reveal>
          </div>
        </section>
      )}

      {/* 10. Testimonials */}
      {testimonials.length > 0 && (
        <section className="bg-cream py-20 sm:py-28" aria-labelledby="testimonials-heading">
          <div className="container-luxe">
            <Reveal>
              <SectionHeading eyebrow="Reviews" title={sections.testimonials.heading} subtitle={sections.testimonials.subheading || undefined} />
            </Reveal>
            <div className="no-scrollbar -mx-4 mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
              {testimonials.slice(0, 6).map((t, i) => (
                <Reveal key={t.id} delay={(i % 3) * 90} className="w-[82vw] shrink-0 snap-center md:w-auto">
                  <figure className="flex h-full flex-col border border-line bg-ivory p-8">
                    <Stars value={t.rating} />
                    {t.title && <p className="mt-5 font-display text-2xl leading-snug">&ldquo;{t.title}&rdquo;</p>}
                    <blockquote className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-charcoal">{t.comment}</blockquote>
                    <figcaption className="mt-6 flex items-center justify-between border-t border-line pt-5 text-xs">
                      <span className="eyebrow text-[0.62rem]">
                        {t.name}
                        {t.location && <span className="text-stone"> · {t.location}</span>}
                      </span>
                      {t.product && (
                        <Link href={`/products/${t.product.slug}`} className="text-stone underline-offset-4 hover:underline">
                          {t.product.name.replace(/ Moisturizing/, "")}
                        </Link>
                      )}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 11. Social */}
      {sections.social.isVisible && sections.social.images.length > 0 && (
        <section className="py-20 sm:py-24" aria-labelledby="social-heading">
          <div className="container-luxe">
            <Reveal className="mb-10 text-center">
              <p className="eyebrow mb-3 text-gold-deep">{sections.social.text}</p>
              <h2 id="social-heading" className="font-display text-[2.1rem] sm:text-5xl">{sections.social.heading}</h2>
              {settings.social.instagram && (
                <a href={settings.social.instagram} target="_blank" rel="noopener noreferrer" className="eyebrow mt-4 inline-flex items-center gap-2 text-stone hover:text-ink">
                  <InstagramIcon size={16} /> Follow on Instagram
                </a>
              )}
            </Reveal>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 lg:grid-cols-6">
              {sections.social.images.slice(0, 6).map((src, i) => {
                const tile = (
                  <div className="group relative aspect-square overflow-hidden bg-sand">
                    <Image src={src} alt="" fill sizes="(min-width:1024px) 16vw, 33vw" className="object-cover transition-transform duration-[1.2s] group-hover:scale-105" />
                    <div className="absolute inset-0 grid place-items-center bg-ink/0 text-ivory opacity-0 transition-all duration-500 group-hover:bg-ink/35 group-hover:opacity-100">
                      <InstagramIcon size={22} />
                    </div>
                  </div>
                );
                return settings.social.instagram ? (
                  <a key={i} href={settings.social.instagram} target="_blank" rel="noopener noreferrer" aria-label={`Instagram post ${i + 1}`}>
                    {tile}
                  </a>
                ) : (
                  <div key={i}>{tile}</div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <RecentlyViewed currency={c} title="Pick up where you left off" />

      {/* 12. Newsletter */}
      <section className="container-luxe" aria-labelledby="newsletter-heading">
        <div className="border border-gold/40 bg-cream px-6 py-14 text-center sm:px-12 sm:py-20">
          <p className="eyebrow text-gold-deep">Newsletter</p>
          <h2 id="newsletter-heading" className="mx-auto mt-3 max-w-xl font-display text-[2.1rem] leading-tight sm:text-5xl">
            {settings.newsletter.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-stone">{settings.newsletter.text}</p>
          <div className="mx-auto mt-8 max-w-md text-left">
            <NewsletterForm source="homepage" />
          </div>
        </div>
      </section>
    </>
  );
}

function ProductSection({
  title,
  subtitle,
  eyebrow,
  products,
  currency,
  href,
  priority,
}: {
  title: string;
  subtitle?: string;
  eyebrow: string;
  products: ProductCardData[];
  currency: string;
  href: string;
  priority?: boolean;
}) {
  return (
    <section className="py-20 sm:py-28" aria-label={title}>
      <div className="container-luxe">
        <Reveal className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow mb-3 text-gold-deep">{eyebrow}</p>
            <h2 className="font-display text-[2.1rem] leading-[1.1] sm:text-5xl">{title}</h2>
            {subtitle && <p className="mt-3 text-stone">{subtitle}</p>}
          </div>
          <Link href={href} className="eyebrow inline-flex items-center gap-2 hover:text-gold-deep">
            View all <ArrowRight size={16} />
          </Link>
        </Reveal>
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-6">
          {products.map((p, i) => (
            <Reveal key={p.id} delay={i * 80}>
              <ProductCard product={p} currency={currency} priority={priority && i < 2} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
