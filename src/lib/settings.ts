import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { CurrencyConfig } from "@/lib/money";
import { DEFAULT_CA_TAX_RATES } from "@/lib/regions";

// ───────────── Store settings ─────────────

export type StoreSettings = {
  storeName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  businessEmail: string;
  phone: string;
  whatsapp: string;
  address: string;
  /** Base currency: product prices, shipping fees and reports use this. */
  currency: string;
  /** Extra currencies shoppers can view and pay in, with the owner's exchange rates. */
  currencies: CurrencyConfig[];
  timezone: string;
  storeOpen: boolean;
  social: { instagram: string; facebook: string; tiktok: string; twitter: string; youtube: string };
  announcement: { enabled: boolean; messages: string[]; link: string };
  seo: { defaultTitle: string; defaultDescription: string; ogImageUrl: string };
  tax: {
    enabled: boolean;
    /** "province": Canadian orders use the rate for the delivery province. "flat": one rate for every order. */
    mode: "province" | "flat";
    label: string;
    flatRatePercent: number;
    provinceRates: Record<string, number>;
    /** Charge tax on international (non-Canadian) orders too? Usually no — exports are zero-rated. */
    chargeInternational: boolean;
  };
  email: { fromName: string; orderAlertEmail: string };
  newsletter: { heading: string; text: string };
  footer: { blurb: string };
  contact: { hours: string; intro: string };
  returnsSummary: string;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Rivkah Luxe",
  tagline: "Luxury care, made for you.",
  logoUrl: "",
  faviconUrl: "",
  businessEmail: "",
  phone: "",
  whatsapp: "",
  address: "",
  currency: "CAD",
  currencies: [
    { code: "CAD", rate: 1, roundTo: 1, enabled: true },
    { code: "USD", rate: 0.72, roundTo: 1, enabled: true },
    { code: "NGN", rate: 1100, roundTo: 10000, enabled: true },
  ],
  timezone: "America/Toronto",
  storeOpen: true,
  social: { instagram: "", facebook: "", tiktok: "", twitter: "", youtube: "" },
  announcement: { enabled: true, messages: [], link: "" },
  seo: {
    defaultTitle: "Rivkah Luxe — Luxury body care",
    defaultDescription: "Luxury body oils, scrubs and body care — shipped from Canada to the world.",
    ogImageUrl: "",
  },
  tax: { enabled: true, mode: "province", label: "Sales tax", flatRatePercent: 0, provinceRates: DEFAULT_CA_TAX_RATES, chargeInternational: false },
  email: { fromName: "Rivkah Luxe", orderAlertEmail: "" },
  newsletter: { heading: "Join the inner circle", text: "New arrivals, restocks and quiet offers — straight to your inbox." },
  footer: { blurb: "Body care made with intention." },
  contact: { hours: "Monday – Saturday, 9am – 6pm", intro: "We'd love to hear from you." },
  returnsSummary: "Unopened items can be returned within 14 days of delivery.",
};

function merge<T>(base: T, value: unknown): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k];
    if (b && typeof b === "object" && !Array.isArray(b)) out[k] = merge(b, v);
    else if (v !== undefined && v !== null) out[k] = v;
    // Arrays (e.g. currencies) and records replace the default wholesale.
  }
  return out as T;
}

export const getSettings = cache(async (): Promise<StoreSettings> => {
  try {
    const row = await db.setting.findUnique({ where: { key: "store" } });
    return merge(DEFAULT_SETTINGS, row?.value);
  } catch (err) {
    console.error("[settings] failed to load", err);
    return DEFAULT_SETTINGS;
  }
});

export async function saveSettings(patch: Partial<StoreSettings>) {
  const current = await getSettings();
  const next = merge(current, patch);
  await db.setting.upsert({
    where: { key: "store" },
    create: { key: "store", value: next as unknown as Prisma.InputJsonValue },
    update: { value: next as unknown as Prisma.InputJsonValue },
  });
  return next;
}

// ───────────── Homepage sections ─────────────

export type HeroData = {
  mediaType: "image" | "video";
  imageUrl: string;
  videoUrl: string;
  eyebrow: string;
  heading: string;
  subheading: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
};

export type ProductRowData = { heading: string; subheading: string; count: number };

export type BannerData = {
  imageUrl: string;
  eyebrow: string;
  heading: string;
  text: string;
  ctaText: string;
  ctaLink: string;
};

export type BrandStoryData = {
  imageUrl: string;
  eyebrow: string;
  heading: string;
  body: string;
  ctaText: string;
  ctaLink: string;
};

export type SocialData = { heading: string; text: string; images: string[] };

export type SectionMap = {
  hero: HeroData;
  featured: ProductRowData;
  categories: { heading: string; subheading: string };
  bestSellers: ProductRowData;
  newArrivals: ProductRowData;
  promoBanner: BannerData;
  brandStory: BrandStoryData;
  testimonials: { heading: string; subheading: string };
  social: SocialData;
};

export const DEFAULT_SECTIONS: SectionMap = {
  hero: {
    mediaType: "image",
    imageUrl: "",
    videoUrl: "",
    eyebrow: "Body care, elevated",
    heading: "Luxury Care, Made For You.",
    subheading: "Rich body oils and indulgent rituals that leave your skin soft, glowing and quietly confident.",
    ctaText: "Shop Collection",
    ctaLink: "/shop",
    secondaryCtaText: "Discover Rivkah Luxe",
    secondaryCtaLink: "/about",
  },
  featured: { heading: "The Signatures", subheading: "Our most-loved formulas, chosen for you.", count: 4 },
  categories: { heading: "Shop by ritual", subheading: "" },
  bestSellers: { heading: "Best Sellers", subheading: "What everyone keeps coming back for.", count: 4 },
  newArrivals: { heading: "New Arrivals", subheading: "Fresh to the collection.", count: 4 },
  promoBanner: {
    imageUrl: "",
    eyebrow: "Limited edition",
    heading: "Glow in Luxury",
    text: "Gift sets wrapped in our signature black and gold.",
    ctaText: "Shop Gift Sets",
    ctaLink: "/shop",
  },
  brandStory: {
    imageUrl: "",
    eyebrow: "Our story",
    heading: "Made with intention, worn with confidence.",
    body: "Rivkah Luxe began with a simple belief: caring for your skin should feel like a moment of luxury, every day. Each formula is blended in small batches and finished by hand.",
    ctaText: "Our Story",
    ctaLink: "/about",
  },
  testimonials: { heading: "Loved by our community", subheading: "" },
  social: { heading: "Follow the glow", text: "Share your ritual with us", images: [] },
};

export const SECTION_KEYS = Object.keys(DEFAULT_SECTIONS) as (keyof SectionMap)[];

export const getSections = cache(async () => {
  const rows = await db.homepageSection.findMany().catch(() => []);
  const out = {} as { [K in keyof SectionMap]: SectionMap[K] & { isVisible: boolean } };
  for (const key of SECTION_KEYS) {
    const row = rows.find((r) => r.key === key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (out as any)[key] = { ...merge(DEFAULT_SECTIONS[key], row?.data), isVisible: row?.isVisible ?? true };
  }
  return out;
});
