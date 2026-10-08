"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { audit, notifyAdmin } from "@/lib/audit";
import { cleanHtml } from "@/lib/sanitize";
import { formatMoney, toMinor } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { syncProduct } from "@/lib/catalog";
import { slugify } from "@/lib/utils";
import { fail, FRIENDLY_ERROR, str, type ActionResult } from "@/lib/action";
import type { ProductStatus } from "@/generated/prisma/enums";
import { randomToken } from "@/lib/auth/tokens";

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Each option needs a name (e.g. 237ml)").max(60),
  optionType: z.string().trim().max(30).default("Size"),
  sku: z.string().trim().max(60).optional(),
  price: z.string().trim().min(1, "Each option needs a price"),
  salePrice: z.string().trim().optional(),
  costPrice: z.string().trim().optional(),
  stock: z.coerce.number().int("Stock must be a whole number").min(0, "Stock can't be negative").max(1000000),
  lowStockThreshold: z.coerce.number().int().min(0).max(100000).default(5),
  weightGrams: z.coerce.number().int().min(0).max(100000).optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

const productSchema = z.object({
  name: z.string().trim().min(2, "Please give the product a name").max(140),
  slug: z.string().trim().max(90).optional(),
  sku: z.string().trim().max(60).optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  shortDescription: z.string().max(400).optional(),
  description: z.string().max(40000).optional(),
  ingredients: z.string().max(4000).optional(),
  benefits: z.string().max(4000).optional(),
  howToUse: z.string().max(4000).optional(),
  size: z.string().max(120).optional(),
  dimensions: z.string().max(120).optional(),
  videoUrl: z.string().max(500).optional(),
  tags: z.string().max(500).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "OUT_OF_STOCK"]),
  isFeatured: z.boolean(),
  seoTitle: z.string().max(120).optional(),
  seoDescription: z.string().max(320).optional(),
});

function moneyOrNull(v?: string | null) {
  if (!v) return null;
  const n = toMinor(v);
  return n > 0 ? n : null;
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || `product-${randomToken(4).toLowerCase()}`;
  for (let i = 2; await db.product.findFirst({ where: { slug, NOT: excludeId ? { id: excludeId } : undefined } }); i++) slug = `${slugify(base)}-${i}`;
  return slug;
}

async function uniqueSku(base: string, exclude: { productId?: string; variantIds?: string[] } = {}) {
  let sku = base.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 50) || `RL-${randomToken(4).toUpperCase()}`;
  const taken = async (s: string) =>
    (await db.productVariant.findFirst({ where: { sku: s, NOT: exclude.variantIds?.length ? { id: { in: exclude.variantIds } } : undefined } })) ||
    (await db.product.findFirst({ where: { sku: s, NOT: exclude.productId ? { id: exclude.productId } : undefined } }));
  for (let i = 2; await taken(sku); i++) sku = `${base.toUpperCase()}-${i}`;
  return sku;
}

export async function saveProduct(_prev: unknown, fd: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireAdmin("products");
  const id = str(fd, "id") || undefined;
  const parsed = productSchema.safeParse({
    name: str(fd, "name"),
    slug: str(fd, "slug") || undefined,
    sku: str(fd, "sku") || undefined,
    categoryId: str(fd, "categoryId") || undefined,
    subcategoryId: str(fd, "subcategoryId") || undefined,
    shortDescription: str(fd, "shortDescription") || undefined,
    description: str(fd, "description") || undefined,
    ingredients: str(fd, "ingredients") || undefined,
    benefits: str(fd, "benefits") || undefined,
    howToUse: str(fd, "howToUse") || undefined,
    size: str(fd, "size") || undefined,
    dimensions: str(fd, "dimensions") || undefined,
    videoUrl: str(fd, "videoUrl") || undefined,
    tags: str(fd, "tags") || undefined,
    status: str(fd, "status") || "DRAFT",
    isFeatured: fd.get("isFeatured") === "on",
    seoTitle: str(fd, "seoTitle") || undefined,
    seoDescription: str(fd, "seoDescription") || undefined,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] ??= i.message;
    return fail("Please check the highlighted fields.", fe);
  }
  let variantsInput: z.infer<typeof variantSchema>[];
  let images: { url: string; alt?: string }[];
  try {
    variantsInput = z.array(variantSchema).min(1, "Add at least one price").parse(JSON.parse(str(fd, "variants") || "[]"));
    images = z.array(z.object({ url: z.string().min(1).max(500), alt: z.string().max(200).optional() })).max(30).parse(JSON.parse(str(fd, "images") || "[]"));
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0].message : "Please check the prices and options.";
    return fail(msg, { variants: msg });
  }
  for (const v of variantsInput) {
    if (!toMinor(v.price)) return fail(`Please enter a price for "${v.name}".`, { variants: "Price required" });
    const sale = moneyOrNull(v.salePrice);
    if (sale && sale >= toMinor(v.price)) return fail(`The sale price for "${v.name}" must be lower than the normal price.`, { variants: "Sale price too high" });
  }
  const collectionIds = fd.getAll("collections").map(String).filter(Boolean);
  const d = parsed.data;
  const settings = await getSettings();

  try {
    const existing = id ? await db.product.findUnique({ where: { id }, include: { variants: true } }) : null;
    if (id && !existing) return fail("This product no longer exists.");
    const slug = await uniqueSlug(d.slug || d.name, id);
    const productSku = await uniqueSku(d.sku || `RL-${slugify(d.name).slice(0, 18)}`, { productId: id });
    const data = {
      name: d.name,
      slug,
      sku: productSku,
      categoryId: d.categoryId || null,
      subcategoryId: d.subcategoryId || null,
      shortDescription: d.shortDescription || null,
      description: d.description ? cleanHtml(d.description) || null : null,
      ingredients: d.ingredients || null,
      benefits: d.benefits || null,
      howToUse: d.howToUse || null,
      size: d.size || null,
      dimensions: d.dimensions || null,
      videoUrl: d.videoUrl || null,
      tags: (d.tags || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 30),
      status: d.status as ProductStatus,
      isFeatured: d.isFeatured,
      seoTitle: d.seoTitle || null,
      seoDescription: d.seoDescription || null,
    };

    const product = existing
      ? await db.product.update({ where: { id: existing.id }, data: { ...data, collections: { set: collectionIds.map((c) => ({ id: c })) } } })
      : await db.product.create({ data: { ...data, collections: { connect: collectionIds.map((c) => ({ id: c })) } } });

    // Images: replace the list in the chosen order.
    await db.productImage.deleteMany({ where: { productId: product.id } });
    if (images.length) await db.productImage.createMany({ data: images.map((im, i) => ({ productId: product.id, url: im.url, alt: im.alt || product.name, sortOrder: i })) });

    // Variants: update, create, remove.
    const keepIds = variantsInput.map((v) => v.id).filter(Boolean) as string[];
    const changes: string[] = [];
    const removed = existing?.variants.filter((v) => !keepIds.includes(v.id)) ?? [];
    if (removed.length) await db.productVariant.deleteMany({ where: { id: { in: removed.map((v) => v.id) } } });

    for (const [i, v] of variantsInput.entries()) {
      const before = existing?.variants.find((x) => x.id === v.id);
      const sku = await uniqueSku(v.sku || `${productSku}-${slugify(v.name)}`, { productId: product.id, variantIds: before ? [before.id] : [] });
      const row = {
        name: v.name,
        optionType: v.optionType || "Size",
        sku,
        price: toMinor(v.price),
        salePrice: moneyOrNull(v.salePrice),
        costPrice: moneyOrNull(v.costPrice),
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
        weightGrams: v.weightGrams ?? null,
        imageUrl: v.imageUrl || null,
        isActive: v.isActive,
        isDefault: i === 0,
        sortOrder: i,
      };
      const label = `${product.name}${variantsInput.length > 1 || v.name !== "Default" ? ` (${v.name})` : ""}`;
      if (before) {
        await db.productVariant.update({ where: { id: before.id }, data: row });
        if (before.price !== row.price) changes.push(`changed ${label} price from ${formatMoney(before.price, settings.currency)} to ${formatMoney(row.price, settings.currency)}`);
        if ((before.salePrice ?? 0) !== (row.salePrice ?? 0))
          changes.push(row.salePrice ? `put ${label} on sale at ${formatMoney(row.salePrice, settings.currency)}` : `ended the sale on ${label}`);
        if (before.stock !== row.stock) {
          await db.inventoryMovement.create({ data: { variantId: before.id, change: row.stock - before.stock, stockAfter: row.stock, reason: "ADJUSTMENT", userId: user.id, note: "Edited on product page" } });
          changes.push(`changed ${label} stock from ${before.stock} to ${row.stock}`);
        }
      } else {
        const created = await db.productVariant.create({ data: { ...row, productId: product.id } });
        if (row.stock) await db.inventoryMovement.create({ data: { variantId: created.id, change: row.stock, stockAfter: row.stock, reason: "INITIAL", userId: user.id } });
      }
    }
    await syncProduct(product.id);

    if (existing) {
      await audit(user, "Edited product", "Product", product.id, changes.length ? `${user.name} ${changes.join("; ")}.` : `${user.name} updated ${product.name}.`);
    } else {
      await audit(user, "Added product", "Product", product.id, `${user.name} added ${product.name}.`);
    }
    revalidatePath("/", "layout");
    return { ok: true, message: existing ? "Product saved." : "Product added.", data: { id: product.id } };
  } catch (err) {
    console.error("[admin:saveProduct]", err);
    return fail(FRIENDLY_ERROR);
  }
}

export async function duplicateProduct(id: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireAdmin("products");
  const p = await db.product.findUnique({ where: { id }, include: { variants: true, images: true, collections: { select: { id: true } } } });
  if (!p) return fail("Product not found.");
  const name = `${p.name} (copy)`;
  const slug = await uniqueSlug(name);
  const sku = await uniqueSku(`${p.sku}-COPY`);
  const copy = await db.product.create({
    data: {
      name, slug, sku, status: "DRAFT", isFeatured: false,
      shortDescription: p.shortDescription, description: p.description, ingredients: p.ingredients, benefits: p.benefits, howToUse: p.howToUse,
      size: p.size, dimensions: p.dimensions, videoUrl: p.videoUrl, tags: p.tags, categoryId: p.categoryId, subcategoryId: p.subcategoryId,
      seoTitle: null, seoDescription: p.seoDescription, minPrice: p.minPrice,
      collections: { connect: p.collections },
      images: { create: p.images.map((i) => ({ url: i.url, alt: i.alt, sortOrder: i.sortOrder })) },
    },
  });
  for (const v of p.variants) {
    await db.productVariant.create({
      data: {
        productId: copy.id, name: v.name, optionType: v.optionType, sku: await uniqueSku(`${v.sku}-COPY`), price: v.price, salePrice: v.salePrice,
        costPrice: v.costPrice, stock: 0, lowStockThreshold: v.lowStockThreshold, weightGrams: v.weightGrams, imageUrl: v.imageUrl,
        isDefault: v.isDefault, sortOrder: v.sortOrder,
      },
    });
  }
  await audit(user, "Duplicated product", "Product", copy.id, `${user.name} duplicated ${p.name}.`);
  revalidatePath("/admin/products");
  return { ok: true, message: "Copy created as a draft (stock set to 0).", data: { id: copy.id } };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const user = await requireAdmin("products");
  const p = await db.product.findUnique({ where: { id } });
  if (!p) return fail("Product not found.");
  await db.product.delete({ where: { id } });
  await audit(user, "Deleted product", "Product", id, `${user.name} deleted ${p.name}.`);
  revalidatePath("/", "layout");
  return { ok: true, message: `${p.name} deleted. Past orders still show it.` };
}

export async function setProductStatus(id: string, status: ProductStatus): Promise<ActionResult> {
  const user = await requireAdmin("products");
  const p = await db.product.update({ where: { id }, data: { status } });
  await audit(user, "Changed product status", "Product", id, `${user.name} set ${p.name} to ${status.toLowerCase().replace(/_/g, " ")}.`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Updated." };
}

export type BulkAction = "publish" | "draft" | "archive" | "delete" | "feature" | "unfeature" | "category" | "stock-set" | "stock-add";

export async function bulkProducts(ids: string[], action: BulkAction, value?: string): Promise<ActionResult> {
  const user = await requireAdmin("products");
  const clean = ids.filter((i) => typeof i === "string").slice(0, 500);
  if (!clean.length) return fail("Select at least one product.");
  const where = { id: { in: clean } };
  switch (action) {
    case "publish":
    case "draft":
    case "archive":
      await db.product.updateMany({ where, data: { status: action === "publish" ? "PUBLISHED" : action === "draft" ? "DRAFT" : "ARCHIVED" } });
      break;
    case "delete":
      await db.product.deleteMany({ where });
      break;
    case "feature":
    case "unfeature":
      await db.product.updateMany({ where, data: { isFeatured: action === "feature" } });
      break;
    case "category":
      await db.product.updateMany({ where, data: { categoryId: value || null } });
      break;
    case "stock-set":
    case "stock-add": {
      const n = Number(value);
      if (!Number.isInteger(n) || (action === "stock-set" && n < 0)) return fail("Please enter a whole number.");
      const variants = await db.productVariant.findMany({ where: { productId: { in: clean } } });
      for (const v of variants) {
        const next = Math.max(0, action === "stock-set" ? n : v.stock + n);
        await db.productVariant.update({ where: { id: v.id }, data: { stock: next } });
        await db.inventoryMovement.create({ data: { variantId: v.id, change: next - v.stock, stockAfter: next, reason: action === "stock-add" && n > 0 ? "RESTOCK" : "ADJUSTMENT", userId: user.id, note: "Bulk stock update" } });
      }
      break;
    }
  }
  await audit(user, "Bulk edit", "Product", null, `${user.name} applied "${action}" to ${clean.length} product${clean.length > 1 ? "s" : ""}.`);
  revalidatePath("/", "layout");
  return { ok: true, message: `Updated ${clean.length} product${clean.length > 1 ? "s" : ""}.` };
}

// ───────────── Stock ─────────────

export async function updateStock(variantId: string, mode: "set" | "add", amount: number, note?: string): Promise<ActionResult> {
  const user = await requireAdmin("inventory");
  if (!Number.isInteger(amount)) return fail("Please enter a whole number.");
  const v = await db.productVariant.findUnique({ where: { id: variantId }, include: { product: { select: { name: true } } } });
  if (!v) return fail("Item not found.");
  const next = Math.max(0, mode === "set" ? amount : v.stock + amount);
  if (next === v.stock) return { ok: true, message: "No change." };
  await db.productVariant.update({ where: { id: v.id }, data: { stock: next } });
  await db.inventoryMovement.create({
    data: { variantId: v.id, change: next - v.stock, stockAfter: next, reason: next > v.stock && mode === "add" ? "RESTOCK" : "ADJUSTMENT", userId: user.id, note: note?.slice(0, 200) || null },
  });
  const label = `${v.product.name}${v.name !== "Default" ? ` (${v.name})` : ""}`;
  await audit(user, "Updated stock", "ProductVariant", v.id, `${user.name} changed ${label} stock from ${v.stock} to ${next}.`);
  if (next <= v.lowStockThreshold && v.stock > v.lowStockThreshold) {
    await notifyAdmin(next === 0 ? "OUT_OF_STOCK" : "LOW_STOCK", next === 0 ? `${label} is out of stock` : `${label} is running low`, `${next} left.`, "/admin/inventory");
  }
  revalidatePath("/", "layout");
  return { ok: true, message: `${label}: ${next} in stock.` };
}

// ───────────── Categories & collections ─────────────

const catSchema = z.object({
  name: z.string().trim().min(2, "Please enter a name").max(80),
  description: z.string().max(400).optional(),
  imageUrl: z.string().max(500).optional(),
  parentId: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean(),
  showOnHomepage: z.boolean(),
  seoTitle: z.string().max(120).optional(),
  seoDescription: z.string().max(320).optional(),
});

export async function saveCategory(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const user = await requireAdmin("products");
  const parsed = catSchema.safeParse({
    name: str(fd, "name"),
    description: str(fd, "description") || undefined,
    imageUrl: str(fd, "imageUrl") || undefined,
    parentId: str(fd, "parentId") || undefined,
    sortOrder: str(fd, "sortOrder") || 0,
    isActive: fd.get("isActive") === "on",
    showOnHomepage: fd.get("showOnHomepage") === "on",
    seoTitle: str(fd, "seoTitle") || undefined,
    seoDescription: str(fd, "seoDescription") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message, { name: parsed.error.issues[0].message });
  const id = str(fd, "id");
  const d = parsed.data;
  if (id && d.parentId === id) return fail("A category can't be inside itself.");
  let slug = slugify(str(fd, "slug") || d.name);
  for (let i = 2; await db.category.findFirst({ where: { slug, NOT: id ? { id } : undefined } }); i++) slug = `${slugify(d.name)}-${i}`;
  const data = { ...d, slug, parentId: d.parentId || null, imageUrl: d.imageUrl || null, description: d.description || null, seoTitle: d.seoTitle || null, seoDescription: d.seoDescription || null };
  if (id) await db.category.update({ where: { id }, data });
  else await db.category.create({ data });
  await audit(user, id ? "Edited category" : "Added category", "Category", id || null, `${user.name} ${id ? "updated" : "added"} the ${d.name} category.`);
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Category saved." : "Category added." };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const user = await requireAdmin("products");
  const c = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!c) return fail("Category not found.");
  await db.category.delete({ where: { id } });
  await audit(user, "Deleted category", "Category", id, `${user.name} deleted the ${c.name} category (${c._count.products} products are now uncategorised).`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Category deleted. Its products were kept." };
}

export async function saveCollection(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const user = await requireAdmin("products");
  const name = str(fd, "name");
  if (name.length < 2) return fail("Please enter a name.", { name: "Required" });
  const id = str(fd, "id");
  let slug = slugify(str(fd, "slug") || name);
  for (let i = 2; await db.collection.findFirst({ where: { slug, NOT: id ? { id } : undefined } }); i++) slug = `${slugify(name)}-${i}`;
  const data = {
    name: name.slice(0, 80), slug, description: str(fd, "description").slice(0, 400) || null, imageUrl: str(fd, "imageUrl") || null,
    isActive: fd.get("isActive") === "on", sortOrder: Number(str(fd, "sortOrder")) || 0,
  };
  if (id) await db.collection.update({ where: { id }, data });
  else await db.collection.create({ data });
  await audit(user, id ? "Edited collection" : "Added collection", "Collection", id || null, `${user.name} ${id ? "updated" : "added"} the ${name} collection.`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Collection saved." };
}

export async function deleteCollection(id: string): Promise<ActionResult> {
  const user = await requireAdmin("products");
  const c = await db.collection.delete({ where: { id } }).catch(() => null);
  if (!c) return fail("Collection not found.");
  await audit(user, "Deleted collection", "Collection", id, `${user.name} deleted the ${c.name} collection.`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Collection deleted." };
}
