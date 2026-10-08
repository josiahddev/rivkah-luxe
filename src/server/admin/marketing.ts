"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { toMinor } from "@/lib/money";
import { syncRating } from "@/lib/catalog";
import { fail, FRIENDLY_ERROR, str, type ActionResult } from "@/lib/action";

const dateOrNull = (v: string) => (v ? new Date(v) : null);

// ───────────── Discount codes ─────────────

const couponSchema = z.object({
  code: z.string().trim().min(3, "Codes need at least 3 characters").max(30).regex(/^[A-Z0-9_-]+$/, "Use letters, numbers, - or _ only (no spaces)"),
  description: z.string().max(200).optional(),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  value: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  usageLimit: z.string().optional(),
  usageLimitPerCustomer: z.string().optional(),
  minOrderAmount: z.string().optional(),
});

export async function saveCoupon(_prev: unknown, fd: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireAdmin("discounts");
  const parsed = couponSchema.safeParse({
    code: str(fd, "code").toUpperCase(),
    description: str(fd, "description") || undefined,
    type: str(fd, "type"),
    value: str(fd, "value"),
    startsAt: str(fd, "startsAt"),
    endsAt: str(fd, "endsAt"),
    usageLimit: str(fd, "usageLimit"),
    usageLimitPerCustomer: str(fd, "usageLimitPerCustomer"),
    minOrderAmount: str(fd, "minOrderAmount"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message, { [String(parsed.error.issues[0].path[0])]: parsed.error.issues[0].message });
  const d = parsed.data;
  let value = 0;
  if (d.type === "PERCENTAGE") {
    value = Math.round(Number(d.value));
    if (!(value > 0 && value <= 100)) return fail("Enter a percentage between 1 and 100.", { value: "1–100" });
  } else if (d.type === "FIXED") {
    value = toMinor(d.value || "");
    if (!value) return fail("Enter the amount to take off.", { value: "Required" });
  }
  const startsAt = dateOrNull(d.startsAt || "");
  const endsAt = dateOrNull(d.endsAt || "");
  if (startsAt && endsAt && endsAt <= startsAt) return fail("The end date must be after the start date.", { endsAt: "Must be after start" });
  const id = str(fd, "id");
  const clash = await db.coupon.findFirst({ where: { code: d.code, NOT: id ? { id } : undefined } });
  if (clash) return fail("That code already exists.", { code: "Already used" });
  const data = {
    code: d.code,
    description: d.description || null,
    type: d.type,
    value,
    startsAt,
    endsAt,
    usageLimit: d.usageLimit ? Number(d.usageLimit) : null,
    usageLimitPerCustomer: d.usageLimitPerCustomer ? Number(d.usageLimitPerCustomer) : null,
    minOrderAmount: d.minOrderAmount ? toMinor(d.minOrderAmount) || null : null,
    firstOrderOnly: fd.get("firstOrderOnly") === "on",
    isActive: fd.get("isActive") === "on",
    products: { set: fd.getAll("products").map((p) => ({ id: String(p) })) },
    categories: { set: fd.getAll("categories").map((c) => ({ id: String(c) })) },
  };
  try {
    const c = id
      ? await db.coupon.update({ where: { id }, data })
      : await db.coupon.create({ data: { ...data, products: { connect: data.products.set }, categories: { connect: data.categories.set } } });
    await audit(user, id ? "Edited discount" : "Created discount", "Coupon", c.id, `${user.name} ${id ? "updated" : "created"} discount code ${c.code}.`);
    revalidatePath("/admin/discounts");
    return { ok: true, message: id ? "Discount saved." : `Code ${c.code} is ready to use.`, data: { id: c.id } };
  } catch (err) {
    console.error("[admin:coupon]", err);
    return fail(FRIENDLY_ERROR);
  }
}

export async function toggleCoupon(id: string, isActive: boolean): Promise<ActionResult> {
  const user = await requireAdmin("discounts");
  const c = await db.coupon.update({ where: { id }, data: { isActive } });
  await audit(user, isActive ? "Turned on discount" : "Turned off discount", "Coupon", id, `${user.name} turned ${isActive ? "on" : "off"} code ${c.code}.`);
  revalidatePath("/admin/discounts");
  return { ok: true, message: isActive ? "Code turned on." : "Code turned off." };
}

export async function deleteCoupon(id: string): Promise<ActionResult> {
  const user = await requireAdmin("discounts");
  const c = await db.coupon.delete({ where: { id } }).catch(() => null);
  if (!c) return fail("Code not found.");
  await audit(user, "Deleted discount", "Coupon", id, `${user.name} deleted code ${c.code}.`);
  revalidatePath("/admin/discounts");
  return { ok: true, message: "Code deleted." };
}

// ───────────── Promotions ─────────────

export async function savePromotion(_prev: unknown, fd: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireAdmin("promotions");
  const name = str(fd, "name");
  const headline = str(fd, "headline");
  if (name.length < 2) return fail("Give the promotion a name.", { name: "Required" });
  if (headline.length < 2) return fail("Add a headline customers will see.", { headline: "Required" });
  const startsAt = dateOrNull(str(fd, "startsAt"));
  const endsAt = dateOrNull(str(fd, "endsAt"));
  if (startsAt && endsAt && endsAt <= startsAt) return fail("The end date must be after the start date.", { endsAt: "Must be after start" });
  const data = {
    name: name.slice(0, 80),
    headline: headline.slice(0, 120),
    subheading: str(fd, "subheading").slice(0, 300) || null,
    imageUrl: str(fd, "imageUrl") || null,
    ctaText: str(fd, "ctaText").slice(0, 40) || null,
    ctaLink: str(fd, "ctaLink").slice(0, 200) || null,
    discountText: str(fd, "discountText").slice(0, 60) || null,
    couponId: str(fd, "couponId") || null,
    collectionId: str(fd, "collectionId") || null,
    showAsHero: fd.get("showAsHero") === "on",
    showAsBanner: fd.get("showAsBanner") === "on",
    isActive: fd.get("isActive") === "on",
    startsAt,
    endsAt,
  };
  const id = str(fd, "id");
  const p = id ? await db.promotion.update({ where: { id }, data }) : await db.promotion.create({ data });
  await audit(user, id ? "Edited promotion" : "Created promotion", "Promotion", p.id, `${user.name} ${id ? "updated" : "created"} the “${p.name}” promotion.`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Promotion saved.", data: { id: p.id } };
}

export async function deletePromotion(id: string): Promise<ActionResult> {
  const user = await requireAdmin("promotions");
  const p = await db.promotion.delete({ where: { id } }).catch(() => null);
  if (!p) return fail("Promotion not found.");
  await audit(user, "Deleted promotion", "Promotion", id, `${user.name} deleted the “${p.name}” promotion.`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Promotion deleted." };
}

// ───────────── Reviews ─────────────

export async function moderateReview(id: string, action: "approve" | "reject" | "feature" | "unfeature" | "delete"): Promise<ActionResult> {
  const user = await requireAdmin("reviews");
  const r = await db.review.findUnique({ where: { id }, include: { product: { select: { name: true } } } });
  if (!r) return fail("Review not found.");
  if (action === "delete") await db.review.delete({ where: { id } });
  else
    await db.review.update({
      where: { id },
      data: action === "approve" ? { status: "APPROVED" } : action === "reject" ? { status: "REJECTED", isFeatured: false } : { isFeatured: action === "feature", ...(action === "feature" ? { status: "APPROVED" } : {}) },
    });
  if (r.productId) await syncRating(r.productId);
  const verbs = { approve: "approved", reject: "hid", feature: "featured", unfeature: "un-featured", delete: "deleted" };
  await audit(user, "Moderated review", "Review", id, `${user.name} ${verbs[action]} a review by ${r.name}${r.product ? ` on ${r.product.name}` : ""}.`);
  revalidatePath("/", "layout");
  return { ok: true, message: `Review ${verbs[action]}.` };
}

export async function saveReview(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const user = await requireAdmin("reviews");
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Customer name required").max(80),
      location: z.string().max(80).optional(),
      rating: z.coerce.number().int().min(1).max(5),
      title: z.string().max(120).optional(),
      comment: z.string().trim().min(5, "Write the review text").max(3000),
      productId: z.string().optional(),
    })
    .safeParse({
      name: str(fd, "name"), location: str(fd, "location") || undefined, rating: str(fd, "rating") || 5,
      title: str(fd, "title") || undefined, comment: str(fd, "comment"), productId: str(fd, "productId") || undefined,
    });
  if (!parsed.success) return fail(parsed.error.issues[0].message, { [String(parsed.error.issues[0].path[0])]: parsed.error.issues[0].message });
  const id = str(fd, "id");
  const data = { ...parsed.data, productId: parsed.data.productId || null, isFeatured: fd.get("isFeatured") === "on", status: "APPROVED" as const };
  const r = id ? await db.review.update({ where: { id }, data }) : await db.review.create({ data });
  if (r.productId) await syncRating(r.productId);
  await audit(user, id ? "Edited review" : "Added review", "Review", r.id, `${user.name} ${id ? "edited" : "added"} a review from ${r.name}.`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Review saved." };
}

// ───────────── Messages & subscribers ─────────────

export async function setMessageStatus(id: string, status: "NEW" | "IN_PROGRESS" | "RESOLVED"): Promise<ActionResult> {
  await requireAdmin("messages");
  await db.contactMessage.update({ where: { id }, data: { status } });
  revalidatePath("/admin/messages");
  return { ok: true, message: status === "RESOLVED" ? "Marked as resolved." : status === "IN_PROGRESS" ? "Marked as in progress." : "Marked as new." };
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  await requireAdmin("messages");
  await db.contactMessage.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/messages");
  return { ok: true, message: "Message deleted." };
}

export async function unsubscribe(id: string): Promise<ActionResult> {
  const user = await requireAdmin("subscribers");
  const s = await db.newsletterSubscriber.update({ where: { id }, data: { status: "UNSUBSCRIBED" } });
  await audit(user, "Unsubscribed email", "NewsletterSubscriber", id, `${user.name} unsubscribed ${s.email}.`);
  revalidatePath("/admin/subscribers");
  return { ok: true, message: "Unsubscribed." };
}
