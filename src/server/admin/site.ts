"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { cleanHtml } from "@/lib/sanitize";
import { toMinor } from "@/lib/money";
import { DEFAULT_SECTIONS, getSettings, saveSettings, SECTION_KEYS, type SectionMap, type StoreSettings } from "@/lib/settings";
import { deleteStoredFile } from "@/lib/storage";
import { hashPassword } from "@/lib/auth/password";
import { ADMIN_ROLES } from "@/lib/auth/permissions";
import { slugify } from "@/lib/utils";
import { fail, FRIENDLY_ERROR, str, type ActionResult } from "@/lib/action";
import type { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";

// ───────────── Homepage ─────────────

/** Save one homepage section. Field names in the form match the section's keys. */
export async function saveSection(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const user = await requireAdmin("content");
  const key = str(fd, "key") as keyof SectionMap;
  if (!SECTION_KEYS.includes(key)) return fail("Unknown section.");
  const defaults = DEFAULT_SECTIONS[key] as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const [field, def] of Object.entries(defaults)) {
    if (Array.isArray(def)) data[field] = fd.getAll(field).map(String).filter(Boolean).slice(0, 12);
    else if (typeof def === "number") data[field] = Math.max(1, Math.min(12, Number(str(fd, field)) || (def as number)));
    else data[field] = str(fd, field).slice(0, 2000);
  }
  await db.homepageSection.upsert({
    where: { key },
    create: { key, data: data as Prisma.InputJsonValue, isVisible: fd.get("isVisible") === "on" },
    update: { data: data as Prisma.InputJsonValue, isVisible: fd.get("isVisible") === "on" },
  });
  await audit(user, "Edited homepage", "Homepage", key, `${user.name} updated the homepage “${key}” section.`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Homepage updated. Changes are live." };
}

export async function saveAnnouncement(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const user = await requireAdmin("content");
  const messages = str(fd, "messages").split("\n").map((m) => m.trim()).filter(Boolean).slice(0, 5);
  await saveSettings({ announcement: { enabled: fd.get("enabled") === "on", messages, link: str(fd, "link").slice(0, 200) } });
  await audit(user, "Edited announcement bar", "Homepage", "announcement", `${user.name} updated the announcement bar.`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Announcement bar updated." };
}

// ───────────── Pages ─────────────

export async function savePage(_prev: unknown, fd: FormData): Promise<ActionResult<{ slug: string }>> {
  const user = await requireAdmin("content");
  const title = str(fd, "title");
  if (title.length < 2) return fail("Give the page a title.", { title: "Required" });
  const original = str(fd, "originalSlug");
  const slug = original || slugify(str(fd, "slug") || title);
  const reserved = ["shop", "products", "category", "collections", "cart", "checkout", "account", "admin", "api", "login", "register", "search", "wishlist", "faq", "contact", "track-order"];
  if (!original && reserved.includes(slug)) return fail("That web address is already used by the store. Try another.", { slug: "Reserved" });
  const data = { title: title.slice(0, 120), body: cleanHtml(str(fd, "body")), seoTitle: str(fd, "seoTitle").slice(0, 120) || null, seoDescription: str(fd, "seoDescription").slice(0, 320) || null };
  await db.page.upsert({ where: { slug }, create: { slug, ...data }, update: data });
  await audit(user, "Edited page", "Page", slug, `${user.name} updated the “${data.title}” page.`);
  revalidatePath(`/${slug}`);
  return { ok: true, message: "Page saved.", data: { slug } };
}

export async function deletePage(slug: string): Promise<ActionResult> {
  const user = await requireAdmin("content");
  const core = ["about", "shipping-delivery", "returns-refunds", "privacy-policy", "terms-and-conditions", "cookie-policy"];
  if (core.includes(slug)) return fail("This page is linked from your footer and checkout, so it can't be deleted. You can edit its text instead.");
  await db.page.delete({ where: { slug } }).catch(() => {});
  await audit(user, "Deleted page", "Page", slug, `${user.name} deleted the /${slug} page.`);
  revalidatePath("/admin/content/pages");
  return { ok: true, message: "Page deleted." };
}

// ───────────── FAQ ─────────────

export async function saveFaq(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const user = await requireAdmin("content");
  const question = str(fd, "question");
  const answer = str(fd, "answer");
  if (question.length < 4 || answer.length < 2) return fail("Please write both the question and the answer.");
  const data = { question: question.slice(0, 200), answer: answer.slice(0, 3000), group: str(fd, "group").slice(0, 60) || "General", sortOrder: Number(str(fd, "sortOrder")) || 0, isActive: fd.get("isActive") !== "off" };
  const id = str(fd, "id");
  if (id) await db.faqItem.update({ where: { id }, data });
  else await db.faqItem.create({ data });
  await audit(user, "Edited FAQ", "FaqItem", id || null, `${user.name} ${id ? "updated" : "added"} the FAQ “${data.question}”.`);
  revalidatePath("/faq");
  revalidatePath("/admin/content/faq");
  return { ok: true, message: "FAQ saved." };
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  await requireAdmin("content");
  await db.faqItem.delete({ where: { id } }).catch(() => {});
  revalidatePath("/faq");
  revalidatePath("/admin/content/faq");
  return { ok: true, message: "Question deleted." };
}

// ───────────── Shipping ─────────────

export async function saveZone(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const user = await requireAdmin("shipping");
  const name = str(fd, "name");
  if (name.length < 2) return fail("Give the zone a name, e.g. “Canada”.", { name: "Required" });
  const isFallback = fd.get("isFallback") === "on";
  const countries = fd.getAll("countries").map((c) => String(c).toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c));
  if (!isFallback && countries.length === 0) return fail("Choose at least one country, or tick “Everywhere else”.", { countries: "Required" });
  const fee = str(fd, "fee");
  if (fee === "" || Number.isNaN(Number(fee))) return fail("Enter a shipping fee (0 for free).", { fee: "Required" });
  const data = {
    name: name.slice(0, 80),
    countries: isFallback ? [] : countries,
    regions: isFallback ? [] : str(fd, "regions").split(",").map((r) => r.trim()).filter(Boolean).slice(0, 80),
    fee: toMinor(fee),
    freeOverAmount: str(fd, "freeOverAmount") ? toMinor(str(fd, "freeOverAmount")) || null : null,
    estimatedDelivery: str(fd, "estimatedDelivery").slice(0, 80) || null,
    isFallback,
    isActive: fd.get("isActive") === "on",
    sortOrder: Number(str(fd, "sortOrder")) || 0,
  };
  const id = str(fd, "id");
  if (isFallback) await db.shippingZone.updateMany({ where: { isFallback: true, NOT: id ? { id } : undefined }, data: { isFallback: false } });
  const z = id ? await db.shippingZone.update({ where: { id }, data }) : await db.shippingZone.create({ data });
  await audit(user, id ? "Edited shipping zone" : "Added shipping zone", "ShippingZone", z.id, `${user.name} ${id ? "updated" : "added"} the ${z.name} shipping zone.`);
  revalidatePath("/admin/shipping");
  return { ok: true, message: "Shipping saved." };
}

export async function deleteZone(id: string): Promise<ActionResult> {
  const user = await requireAdmin("shipping");
  const z = await db.shippingZone.delete({ where: { id } }).catch(() => null);
  if (!z) return fail("Zone not found.");
  await audit(user, "Deleted shipping zone", "ShippingZone", id, `${user.name} deleted the ${z.name} shipping zone.`);
  revalidatePath("/admin/shipping");
  return { ok: true, message: "Zone deleted." };
}

// ───────────── Settings ─────────────

const optionalEmail = z.union([z.literal(""), z.email("Please enter a valid email")]);
const optionalUrl = z.union([z.literal(""), z.url("Please enter a full link starting with https://")]);

export async function saveStoreSettings(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const user = await requireAdmin("settings");
  const section = str(fd, "section");
  const current = await getSettings();
  const patch: Partial<StoreSettings> = {};
  try {
    if (section === "store") {
      const parsed = z
        .object({ storeName: z.string().min(2, "Store name required").max(60), businessEmail: optionalEmail, orderAlertEmail: optionalEmail })
        .safeParse({ storeName: str(fd, "storeName"), businessEmail: str(fd, "businessEmail"), orderAlertEmail: str(fd, "orderAlertEmail") });
      if (!parsed.success) return fail(parsed.error.issues[0].message, { [String(parsed.error.issues[0].path[0])]: parsed.error.issues[0].message });
      Object.assign(patch, {
        storeName: parsed.data.storeName,
        tagline: str(fd, "tagline").slice(0, 120),
        businessEmail: parsed.data.businessEmail,
        phone: str(fd, "phone").slice(0, 30),
        whatsapp: str(fd, "whatsapp").replace(/[^\d+]/g, "").slice(0, 20),
        address: str(fd, "address").slice(0, 300),
        logoUrl: str(fd, "logoUrl"),
        faviconUrl: str(fd, "faviconUrl"),
        timezone: str(fd, "timezone") || current.timezone,
        returnsSummary: str(fd, "returnsSummary").slice(0, 200) || current.returnsSummary,
        footer: { blurb: str(fd, "footerBlurb").slice(0, 200) },
        contact: { hours: str(fd, "hours").slice(0, 100), intro: str(fd, "contactIntro").slice(0, 300) },
        newsletter: { heading: str(fd, "newsletterHeading").slice(0, 80) || current.newsletter.heading, text: str(fd, "newsletterText").slice(0, 200) },
        email: { fromName: str(fd, "fromName").slice(0, 60) || current.storeName, orderAlertEmail: parsed.data.orderAlertEmail },
      });
    } else if (section === "social") {
      const links = ["instagram", "facebook", "tiktok", "twitter", "youtube"] as const;
      const social = {} as StoreSettings["social"];
      for (const l of links) {
        const v = str(fd, l);
        if (!optionalUrl.safeParse(v).success) return fail(`The ${l} link must start with https://`, { [l]: "Use a full link" });
        social[l] = v;
      }
      patch.social = social;
      patch.whatsapp = str(fd, "whatsapp").replace(/[^\d+]/g, "").slice(0, 20);
    } else if (section === "currency") {
      const codes = fd.getAll("code").map(String);
      const currencies = codes.map((code, i) => ({
        code: code.toUpperCase().slice(0, 3),
        rate: code === current.currency ? 1 : Number(fd.getAll("rate")[i]) || 0,
        roundTo: Number(fd.getAll("roundTo")[i]) || 1,
        enabled: fd.getAll("enabled").map(String).includes(code),
      }));
      if (currencies.some((c) => c.code !== current.currency && c.enabled && !(c.rate > 0))) return fail("Every currency you switch on needs an exchange rate above 0.");
      patch.currencies = currencies;
    } else if (section === "tax") {
      const rates: Record<string, number> = {};
      for (const [k, v] of fd.entries()) {
        if (k.startsWith("rate_")) {
          const n = Number(v);
          if (Number.isNaN(n) || n < 0 || n > 30) return fail(`Check the rate for ${k.slice(5)} (0–30%).`);
          rates[k.slice(5)] = n;
        }
      }
      patch.tax = {
        enabled: fd.get("enabled") === "on",
        mode: str(fd, "mode") === "flat" ? "flat" : "province",
        label: str(fd, "label").slice(0, 30) || "Sales tax",
        flatRatePercent: Math.max(0, Math.min(30, Number(str(fd, "flatRatePercent")) || 0)),
        provinceRates: rates,
        chargeInternational: fd.get("chargeInternational") === "on",
      };
    } else if (section === "seo") {
      patch.seo = { defaultTitle: str(fd, "defaultTitle").slice(0, 120), defaultDescription: str(fd, "defaultDescription").slice(0, 320), ogImageUrl: str(fd, "ogImageUrl") };
    } else if (section === "publish") {
      patch.storeOpen = fd.get("storeOpen") === "on";
    } else return fail("Unknown settings section.");

    await saveSettings(patch);
    await audit(user, "Changed settings", "Settings", section, `${user.name} updated ${section} settings${section === "publish" ? ` (store is now ${patch.storeOpen ? "open" : "hidden"})` : ""}.`);
    revalidatePath("/", "layout");
    return { ok: true, message: section === "publish" ? (patch.storeOpen ? "Your store is live!" : "Your store is now hidden from customers.") : "Settings saved." };
  } catch (err) {
    console.error("[admin:settings]", err);
    return fail(FRIENDLY_ERROR);
  }
}

// ───────────── Photos ─────────────

export async function deleteMedia(id: string): Promise<ActionResult> {
  const user = await requireAdmin("media");
  const m = await db.mediaAsset.findUnique({ where: { id } });
  if (!m) return fail("Photo not found.");
  const [inProducts, inCategories] = await Promise.all([
    db.productImage.count({ where: { url: m.url } }),
    db.category.count({ where: { imageUrl: m.url } }),
  ]);
  if (inProducts || inCategories) return fail("This photo is still being used. Remove it from those products/categories first.");
  await db.mediaAsset.delete({ where: { id } });
  if (!m.url.startsWith("/demo/")) await deleteStoredFile(m.url);
  await audit(user, "Deleted photo", "MediaAsset", id, `${user.name} deleted the photo ${m.filename}.`);
  revalidatePath("/admin/media");
  return { ok: true, message: "Photo deleted." };
}

export async function updateMediaAlt(id: string, alt: string): Promise<ActionResult> {
  await requireAdmin("media");
  await db.mediaAsset.update({ where: { id }, data: { alt: alt.slice(0, 200) || null } });
  return { ok: true, message: "Description saved." };
}

// ───────────── Team ─────────────

export async function inviteTeamMember(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const admin = await requireAdmin("team");
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Name required").max(80),
      email: z.email("Valid email required"),
      role: z.enum(["SUPER_ADMIN", "STORE_MANAGER", "CONTENT_MANAGER"]),
      password: z.string().min(10, "Temporary password must be at least 10 characters"),
    })
    .safeParse({ name: str(fd, "name"), email: str(fd, "email").toLowerCase(), role: str(fd, "role"), password: String(fd.get("password") ?? "") });
  if (!parsed.success) return fail(parsed.error.issues[0].message, { [String(parsed.error.issues[0].path[0])]: parsed.error.issues[0].message });
  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    if (ADMIN_ROLES.includes(existing.role)) return fail("This person is already on your team.");
    await db.user.update({ where: { id: existing.id }, data: { role: parsed.data.role as Role } });
  } else {
    await db.user.create({ data: { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role as Role, passwordHash: await hashPassword(parsed.data.password) } });
  }
  await audit(admin, "Added team member", "User", null, `${admin.name} gave ${parsed.data.name} (${parsed.data.email}) ${parsed.data.role.replace(/_/g, " ").toLowerCase()} access.`);
  revalidatePath("/admin/team");
  return { ok: true, message: existing ? "Existing account given dashboard access." : "Team member added. Share the temporary password with them privately." };
}

export async function setTeamRole(userId: string, role: Role | "CUSTOMER"): Promise<ActionResult> {
  const admin = await requireAdmin("team");
  if (userId === admin.id) return fail("You can't change your own role.");
  if (role !== "SUPER_ADMIN") {
    const owners = await db.user.count({ where: { role: "SUPER_ADMIN", NOT: { id: userId } } });
    if (owners === 0) return fail("There must always be at least one owner.");
  }
  const u = await db.user.update({ where: { id: userId }, data: { role } });
  if (role === "CUSTOMER") await db.session.deleteMany({ where: { userId } });
  await audit(admin, "Changed team role", "User", userId, `${admin.name} changed ${u.name}'s access to ${role === "CUSTOMER" ? "no dashboard access" : role.replace(/_/g, " ").toLowerCase()}.`);
  revalidatePath("/admin/team");
  return { ok: true, message: role === "CUSTOMER" ? "Dashboard access removed." : "Role updated." };
}
