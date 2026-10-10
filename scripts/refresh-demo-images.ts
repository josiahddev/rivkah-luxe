// Swap the demo store's label artwork for rendered product images, add the demo
// face oil, and register the images in the Photos library.
//   npx tsx scripts/refresh-demo-images.ts
import "dotenv/config";
import type { Prisma } from "../src/generated/prisma/client";
import { createClient } from "../src/lib/db-client";
import { DEMO_CATEGORY_IMAGES, DEMO_COLLECTION_IMAGES, DEMO_HOMEPAGE_IMAGES, DEMO_PRODUCT_IMAGES, FACE_OIL, GLOW_CREAM } from "../prisma/demo-images";

const db = createClient();
const FACE_OIL_DEF = FACE_OIL;

async function main() {
  // Skincare demo products (face oil + glow cream)
  for (const FACE_OIL of [FACE_OIL_DEF, GLOW_CREAM]) {
  if (!(await db.product.findUnique({ where: { slug: FACE_OIL.slug } }))) {
    const cat = await db.category.findUnique({ where: { slug: FACE_OIL.category } });
    const newArrivals = await db.collection.findUnique({ where: { slug: "new-arrivals" } });
    await db.product.create({
      data: {
        name: FACE_OIL.name, slug: FACE_OIL.slug, sku: FACE_OIL.sku, shortDescription: FACE_OIL.short, description: FACE_OIL.description,
        howToUse: FACE_OIL.howToUse, size: FACE_OIL.size, tags: FACE_OIL.tags, status: "PUBLISHED", isFeatured: true, isDemo: true,
        categoryId: cat?.id, minPrice: FACE_OIL.variants[0].price, seoDescription: FACE_OIL.short,
        collections: newArrivals ? { connect: { id: newArrivals.id } } : undefined,
        variants: {
          create: FACE_OIL.variants.map((v, i) => ({
            name: v.name, sku: v.sku, price: v.price, costPrice: v.cost, stock: v.stock, weightGrams: v.weight, optionType: "Volume", isDefault: i === 0,
            movements: { create: { change: v.stock, stockAfter: v.stock, reason: "INITIAL", note: "Opening stock (demo)" } },
          })),
        },
      },
    });
    console.log(`✓ Added ${FACE_OIL.name}`);
  }
  }

  for (const [slug, urls] of Object.entries(DEMO_PRODUCT_IMAGES)) {
    const p = await db.product.findUnique({ where: { slug } });
    if (!p) continue;
    await db.productImage.deleteMany({ where: { productId: p.id } });
    await db.productImage.createMany({ data: urls.map((url, i) => ({ productId: p.id, url, alt: p.name, sortOrder: i })) });
    await db.productVariant.updateMany({ where: { productId: p.id }, data: { imageUrl: null } });
  }
  for (const [slug, imageUrl] of Object.entries(DEMO_CATEGORY_IMAGES)) await db.category.updateMany({ where: { slug }, data: { imageUrl } });
  for (const [slug, imageUrl] of Object.entries(DEMO_COLLECTION_IMAGES)) await db.collection.updateMany({ where: { slug }, data: { imageUrl } });
  await db.promotion.updateMany({ where: { isDemo: true }, data: { imageUrl: "/demo/products/collection-trio.webp" } });
  // Past demo orders keep a picture of what was bought.
  for (const [slug, urls] of Object.entries(DEMO_PRODUCT_IMAGES)) {
    const p = await db.product.findUnique({ where: { slug } });
    if (p) await db.orderItem.updateMany({ where: { productId: p.id }, data: { imageUrl: urls[0] } });
  }

  for (const key of ["brandStory", "social"] as const) {
    const row = await db.homepageSection.findUnique({ where: { key } });
    const data = { ...((row?.data as Record<string, unknown>) ?? {}), ...(key === "brandStory" ? { imageUrl: DEMO_HOMEPAGE_IMAGES.brandStory } : { images: DEMO_HOMEPAGE_IMAGES.social }) };
    await db.homepageSection.upsert({ where: { key }, create: { key, data: data as Prisma.InputJsonValue }, update: { data: data as Prisma.InputJsonValue } });
  }

  const all = new Set([...Object.values(DEMO_PRODUCT_IMAGES).flat(), ...Object.values(DEMO_CATEGORY_IMAGES), ...Object.values(DEMO_COLLECTION_IMAGES), DEMO_HOMEPAGE_IMAGES.brandStory]);
  for (const url of all) {
    await db.mediaAsset.upsert({
      where: { url },
      create: { url, storageKey: url.slice(1), filename: url.split("/").pop()!, mimeType: "image/webp", size: 0, width: 1000, height: 1250, alt: "Demo product image" },
      update: {},
    });
  }
  console.log("✓ Demo images refreshed");
}

main().finally(() => db.$disconnect());
