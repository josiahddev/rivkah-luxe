import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ProductStatus } from "@/generated/prisma/enums";
import { convert, type CurrencyConfig } from "@/lib/money";
import { getDisplayCurrency } from "@/lib/currency";

export const VISIBLE_STATUSES: ProductStatus[] = ["PUBLISHED", "OUT_OF_STOCK"];

export function effectivePrice(v: { price: number; salePrice: number | null }) {
  return v.salePrice !== null && v.salePrice > 0 && v.salePrice < v.price ? v.salePrice : v.price;
}

export const cardSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  ratingAvg: true,
  reviewCount: true,
  createdAt: true,
  shortDescription: true,
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 2, select: { url: true, alt: true } },
  variants: {
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
    select: { id: true, name: true, price: true, salePrice: true, stock: true, imageUrl: true },
  },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  imageAlt: string;
  hoverImage: string | null;
  price: number;
  compareAt: number | null;
  priceFrom: boolean;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  defaultVariantId: string | null;
  variants: { id: string; name: string; price: number; compareAt: number | null; inStock: boolean }[];
  category: string | null;
  shortDescription: string | null;
  isNew: boolean;
  /** Currency the prices above are in (the shopper's display currency). */
  currency: string;
};

const NEW_DAYS = 30;

const BASE: CurrencyConfig = { code: "CAD", rate: 1, roundTo: 1, enabled: true };

export function toCard(p: CardRow, cur: CurrencyConfig = BASE): ProductCardData {
  const variants = p.variants.map((v) => ({
    id: v.id,
    name: v.name,
    price: convert(effectivePrice(v), cur),
    compareAt: effectivePrice(v) < v.price ? convert(v.price, cur) : null,
    inStock: v.stock > 0,
  }));
  const cheapest = [...variants].sort((a, b) => a.price - b.price)[0];
  const firstInStock = variants.find((v) => v.inStock) ?? variants[0];
  const prices = new Set(variants.map((v) => v.price));
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: p.images[0]?.url ?? p.variants[0]?.imageUrl ?? null,
    imageAlt: p.images[0]?.alt || p.name,
    hoverImage: p.images[1]?.url ?? null,
    price: cheapest?.price ?? 0,
    compareAt: cheapest?.compareAt ?? null,
    priceFrom: prices.size > 1,
    rating: p.ratingAvg,
    reviewCount: p.reviewCount,
    inStock: p.status !== "OUT_OF_STOCK" && variants.some((v) => v.inStock),
    defaultVariantId: firstInStock?.id ?? null,
    variants,
    category: p.category?.name ?? null,
    shortDescription: p.shortDescription,
    isNew: Date.now() - p.createdAt.getTime() < NEW_DAYS * 86400000,
    currency: cur.code,
  };
}

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "best-selling" | "top-rated";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "best-selling", label: "Best selling" },
  { value: "top-rated", label: "Highest rated" },
];

function orderBy(sort: SortKey): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" }];
    case "price-asc":
      return [{ minPrice: "asc" }];
    case "price-desc":
      return [{ minPrice: "desc" }];
    case "best-selling":
      return [{ soldCount: "desc" }, { createdAt: "desc" }];
    case "top-rated":
      return [{ ratingAvg: "desc" }, { reviewCount: "desc" }];
    default:
      return [{ isFeatured: "desc" }, { soldCount: "desc" }, { createdAt: "desc" }];
  }
}

export type ListFilters = {
  q?: string;
  category?: string; // slug
  collection?: string; // slug
  min?: number; // minor units
  max?: number;
  availability?: "in-stock" | "out-of-stock";
  sort?: SortKey;
  page?: number;
  perPage?: number;
};

export function searchWhere(q: string): Prisma.ProductWhereInput {
  const term = q.trim();
  const tokens = term.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  return {
    OR: [
      { name: { contains: term, mode: "insensitive" } },
      { shortDescription: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { sku: { equals: term, mode: "insensitive" } },
      { variants: { some: { sku: { equals: term, mode: "insensitive" } } } },
      { tags: { hasSome: tokens } },
      { category: { name: { contains: term, mode: "insensitive" } } },
      ...tokens.map((t) => ({ name: { contains: t, mode: "insensitive" as const } })),
    ],
  };
}

export async function listProducts(f: ListFilters) {
  const perPage = f.perPage ?? 12;
  const page = Math.max(1, f.page ?? 1);
  const and: Prisma.ProductWhereInput[] = [{ status: { in: VISIBLE_STATUSES } }];
  if (f.q) and.push(searchWhere(f.q));
  if (f.category) and.push({ OR: [{ category: { slug: f.category } }, { subcategory: { slug: f.category } }, { category: { parent: { slug: f.category } } }] });
  if (f.collection) and.push({ collections: { some: { slug: f.collection } } });
  if (f.min !== undefined) and.push({ minPrice: { gte: f.min } });
  if (f.max !== undefined) and.push({ minPrice: { lte: f.max } });
  if (f.availability === "in-stock") and.push({ status: "PUBLISHED", variants: { some: { isActive: true, stock: { gt: 0 } } } });
  if (f.availability === "out-of-stock")
    and.push({ OR: [{ status: "OUT_OF_STOCK" }, { variants: { none: { isActive: true, stock: { gt: 0 } } } }] });
  const where: Prisma.ProductWhereInput = { AND: and };
  const cur = await getDisplayCurrency();
  const [rows, total] = await Promise.all([
    db.product.findMany({ where, orderBy: orderBy(f.sort ?? "featured"), skip: (page - 1) * perPage, take: perPage, select: cardSelect }),
    db.product.count({ where }),
  ]);
  return { products: rows.map((r) => toCard(r, cur)), total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function productRow(kind: "featured" | "best" | "new", take: number) {
  const where: Prisma.ProductWhereInput = { status: { in: VISIBLE_STATUSES } };
  if (kind === "featured") where.isFeatured = true;
  const order: Prisma.ProductOrderByWithRelationInput[] =
    kind === "best" ? [{ soldCount: "desc" }, { reviewCount: "desc" }] : kind === "new" ? [{ createdAt: "desc" }] : [{ updatedAt: "desc" }];
  const [rows, cur] = await Promise.all([db.product.findMany({ where, orderBy: order, take, select: cardSelect }), getDisplayCurrency()]);
  return rows.map((r) => toCard(r, cur));
}

export async function cardsByIds(ids: string[]) {
  if (!ids.length) return [];
  const [rows, cur] = await Promise.all([
    db.product.findMany({ where: { id: { in: ids }, status: { in: VISIBLE_STATUSES } }, select: cardSelect }),
    getDisplayCurrency(),
  ]);
  const map = new Map(rows.map((r) => [r.id, toCard(r, cur)]));
  return ids.map((id) => map.get(id)).filter(Boolean) as ProductCardData[];
}

/** Recompute denormalised listing fields after a product or its variants change. */
export async function syncProduct(productId: string) {
  const variants = await db.productVariant.findMany({ where: { productId, isActive: true } });
  const minPrice = variants.length ? Math.min(...variants.map(effectivePrice)) : 0;
  const soldCount = variants.reduce((s, v) => s + v.soldCount, 0);
  await db.product.update({ where: { id: productId }, data: { minPrice, soldCount } });
}

export async function syncRating(productId: string) {
  const agg = await db.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: true,
  });
  await db.product.update({
    where: { id: productId },
    data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count },
  });
}

/** Products often bought in the same orders, falling back to the same category. */
export async function boughtTogether(productId: string, categoryId: string | null, take = 3) {
  const orderIds = await db.orderItem.findMany({
    where: { productId, order: { paymentStatus: "PAID" } },
    select: { orderId: true },
    take: 200,
  });
  let ids: string[] = [];
  if (orderIds.length) {
    const grouped = await db.orderItem.groupBy({
      by: ["productId"],
      where: { orderId: { in: orderIds.map((o) => o.orderId) }, productId: { not: productId } },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take,
    });
    ids = grouped.map((g) => g.productId).filter(Boolean) as string[];
  }
  let cards = await cardsByIds(ids);
  if (cards.length < take) {
    const more = await db.product.findMany({
      where: { status: { in: VISIBLE_STATUSES }, id: { notIn: [productId, ...ids] }, ...(categoryId ? { categoryId } : {}) },
      orderBy: { soldCount: "desc" },
      take: take - cards.length,
      select: cardSelect,
    });
    const cur = await getDisplayCurrency();
    cards = [...cards, ...more.map((r) => toCard(r, cur))];
  }
  return cards;
}

export async function alsoViewed(productId: string, categoryId: string | null, take = 4) {
  const rows = await db.product.findMany({
    where: { status: { in: VISIBLE_STATUSES }, id: { not: productId }, ...(categoryId ? { OR: [{ categoryId }, { isFeatured: true }] } : {}) },
    orderBy: [{ viewCount: "desc" }, { soldCount: "desc" }],
    take,
    select: cardSelect,
  });
  const cur = await getDisplayCurrency();
  return rows.map((r) => toCard(r, cur));
}
