"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { cardSelect, cardsByIds, effectivePrice, searchWhere, toCard, VISIBLE_STATUSES } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { fail, FRIENDLY_ERROR, str, zodFieldErrors, type ActionResult } from "@/lib/action";
import { notifyAdmin } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";
import { adminAlertEmail, contactAckEmail } from "@/lib/email/templates";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";
import { convert } from "@/lib/money";
import { getDisplayCurrency } from "@/lib/currency";

// ───────────── Quick view ─────────────

export async function quickView(productId: string) {
  const p = await db.product.findFirst({
    where: { id: productId, status: { in: VISIBLE_STATUSES } },
    select: {
      ...cardSelect,
      images: { orderBy: { sortOrder: "asc" }, take: 4, select: { url: true, alt: true } },
      variants: {
        where: { isActive: true },
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
        select: { id: true, name: true, price: true, salePrice: true, stock: true, imageUrl: true, optionType: true },
      },
    },
  });
  if (!p) return null;
  const cur = await getDisplayCurrency();
  return {
    ...toCard(p, cur),
    images: p.images,
    optionType: p.variants[0]?.optionType ?? "Size",
    variantsFull: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      price: convert(effectivePrice(v), cur),
      compareAt: effectivePrice(v) < v.price ? convert(v.price, cur) : null,
      stock: v.stock,
      imageUrl: v.imageUrl,
    })),
  };
}

// ───────────── Search suggestions ─────────────

export async function searchSuggest(q: string) {
  const term = q.trim().slice(0, 60);
  if (term.length < 2) return { products: [], categories: [] };
  const cur = await getDisplayCurrency();
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { AND: [{ status: { in: VISIBLE_STATUSES } }, searchWhere(term)] },
      orderBy: [{ soldCount: "desc" }],
      take: 5,
      select: cardSelect,
    }),
    db.category.findMany({ where: { isActive: true, name: { contains: term, mode: "insensitive" } }, take: 3, select: { name: true, slug: true } }),
  ]);
  return { products: products.map((p) => toCard(p, cur)), categories };
}

export async function popularSearches() {
  const rows = await db.searchQuery.findMany({ where: { count: { gte: 2 } }, orderBy: { count: "desc" }, take: 6 });
  if (rows.length >= 3) return rows.map((r) => r.term);
  const tags = await db.product.findMany({ where: { status: "PUBLISHED" }, orderBy: { soldCount: "desc" }, take: 4, select: { name: true } });
  return tags.map((t) => t.name.split(" ").slice(0, 2).join(" "));
}

export async function recentlyViewedCards(ids: string[]) {
  const clean = ids.filter((i) => typeof i === "string" && i.length < 40).slice(0, 8);
  return cardsByIds(clean);
}

export async function recordProductView(productId: string) {
  if (!(await rateLimit(`view:${productId}`, 3, 3600))) return;
  await db.product.update({ where: { id: productId }, data: { viewCount: { increment: 1 } } }).catch(() => {});
}

// ───────────── Wishlist ─────────────

export async function toggleWishlist(productId: string): Promise<{ ok: boolean; saved?: boolean; needsLogin?: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsLogin: true };
  try {
    const existing = await db.wishlistItem.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
    if (existing) {
      await db.wishlistItem.delete({ where: { id: existing.id } });
      revalidatePath("/wishlist");
      return { ok: true, saved: false };
    }
    const exists = await db.product.count({ where: { id: productId, status: { in: VISIBLE_STATUSES } } });
    if (!exists) return { ok: false, error: "This product is no longer available." };
    await db.wishlistItem.create({ data: { userId: user.id, productId } });
    revalidatePath("/wishlist");
    return { ok: true, saved: true };
  } catch (err) {
    console.error("[wishlist]", err);
    return { ok: false, error: FRIENDLY_ERROR };
  }
}

export async function wishlistIds(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } });
  return rows.map((r) => r.productId);
}

// ───────────── Newsletter ─────────────

export async function subscribeNewsletter(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const email = str(fd, "email").toLowerCase();
  const consent = fd.get("consent");
  if (!z.email().safeParse(email).success) return fail("Please enter a valid email address.");
  if (fd.has("consent") === false && fd.get("requireConsent") === "1") return fail("Please tick the box to agree to receive emails.");
  if (str(fd, "company")) return { ok: true, message: "You're on the list." }; // honeypot
  if (!(await rateLimit("newsletter", 5, 600))) return fail("Too many attempts. Please try again later.");
  try {
    await db.newsletterSubscriber.upsert({
      where: { email },
      create: { email, source: str(fd, "source") || "website" },
      update: { status: "SUBSCRIBED" },
    });
    const user = await db.user.findUnique({ where: { email } });
    if (user && consent !== null) await db.user.update({ where: { id: user.id }, data: { marketingConsent: true } });
    return { ok: true, message: "Welcome to the inner circle. You're on the list." };
  } catch (err) {
    console.error("[newsletter]", err);
    return fail(FRIENDLY_ERROR);
  }
}

// ───────────── Contact ─────────────

const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name").max(100),
  email: z.email("Please enter a valid email address"),
  phone: z.string().max(30).optional(),
  subject: z.string().min(2, "Please add a subject").max(150),
  message: z.string().min(10, "Please write a little more (at least 10 characters)").max(5000),
});

export async function submitContact(_prev: unknown, fd: FormData): Promise<ActionResult> {
  if (str(fd, "company")) return { ok: true, message: "Thank you — we'll be in touch soon." };
  const parsed = contactSchema.safeParse({
    name: str(fd, "name"),
    email: str(fd, "email").toLowerCase(),
    phone: str(fd, "phone") || undefined,
    subject: str(fd, "subject"),
    message: str(fd, "message"),
  });
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error.issues));
  if (!(await rateLimit("contact", 4, 900))) return fail("You've sent a few messages already. Please try again a little later.");
  try {
    const msg = await db.contactMessage.create({ data: parsed.data });
    await notifyAdmin("NEW_MESSAGE", `New message from ${msg.name}`, msg.subject, `/admin/messages/${msg.id}`);
    const settings = await getSettings();
    await sendEmail({ to: msg.email, ...contactAckEmail(settings, msg.name, msg.subject) });
    const alertTo = settings.email.orderAlertEmail || settings.businessEmail;
    if (alertTo)
      await sendEmail({
        to: alertTo,
        replyTo: msg.email,
        ...adminAlertEmail(settings, `New message: ${msg.subject}`, [`From ${msg.name} (${msg.email}${msg.phone ? `, ${msg.phone}` : ""})`, msg.message], siteUrl(`/admin/messages/${msg.id}`)),
      });
    return { ok: true, message: "Thank you — your message has been sent. We'll reply as soon as we can." };
  } catch (err) {
    console.error("[contact]", err);
    return fail(FRIENDLY_ERROR);
  }
}

// ───────────── Reviews ─────────────

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Please choose a star rating").max(5),
  title: z.string().max(120).optional(),
  comment: z.string().min(10, "Please write at least a sentence (10+ characters)").max(3000),
  name: z.string().min(2, "Please enter your name").max(80),
  email: z.email("Please enter a valid email").optional(),
});

export async function submitReview(_prev: unknown, fd: FormData): Promise<ActionResult> {
  if (str(fd, "company")) return { ok: true, message: "Thank you for your review!" };
  const user = await getCurrentUser();
  const parsed = reviewSchema.safeParse({
    productId: str(fd, "productId"),
    rating: str(fd, "rating") || 0,
    title: str(fd, "title") || undefined,
    comment: str(fd, "comment"),
    name: str(fd, "name") || user?.name,
    email: (str(fd, "email") || user?.email || "").toLowerCase() || undefined,
  });
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error.issues));
  if (!(await rateLimit("review", 5, 3600))) return fail("You've submitted several reviews recently. Please try again later.");
  try {
    const product = await db.product.findFirst({ where: { id: parsed.data.productId, status: { in: VISIBLE_STATUSES } }, select: { id: true, name: true } });
    if (!product) return fail("This product is no longer available.");
    const email = parsed.data.email;
    const verified = email
      ? (await db.orderItem.count({ where: { productId: product.id, order: { email, paymentStatus: "PAID" } } })) > 0
      : false;
    await db.review.create({
      data: {
        productId: product.id,
        userId: user?.id ?? null,
        name: parsed.data.name,
        email,
        rating: parsed.data.rating,
        title: parsed.data.title,
        comment: parsed.data.comment,
        verifiedPurchase: verified,
      },
    });
    await notifyAdmin("NEW_REVIEW", "New review waiting for approval", `${parsed.data.name} reviewed ${product.name} (${parsed.data.rating}★)`, "/admin/reviews");
    return { ok: true, message: "Thank you! Your review will appear once it has been approved." };
  } catch (err) {
    console.error("[review]", err);
    return fail(FRIENDLY_ERROR);
  }
}
