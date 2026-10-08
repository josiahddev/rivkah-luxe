"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { fail, FRIENDLY_ERROR, str, zodFieldErrors, type ActionResult } from "@/lib/action";
import { rateLimit } from "@/lib/rate-limit";

export async function updateProfile(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({ name: z.string().min(2, "Please enter your name").max(100), phone: z.string().max(30).optional() })
    .safeParse({ name: str(fd, "name"), phone: str(fd, "phone") || undefined });
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error.issues));
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name, phone: parsed.data.phone ?? null } });
  revalidatePath("/account");
  return { ok: true, message: "Your details have been saved." };
}

export async function changePassword(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!(await rateLimit("change-pw", 6, 900, user.id))) return fail("Too many attempts. Please try again later.");
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("password") ?? "");
  if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next))
    return fail("Your new password needs at least 8 characters, including a letter and a number.", { password: "Too weak" });
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(current, row.passwordHash))) return fail("Your current password is incorrect.", { current: "Incorrect password" });
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: true, message: "Password updated." };
}

const addressSchema = z.object({
  label: z.string().max(40).optional(),
  fullName: z.string().min(2, "Please enter a name").max(120),
  phone: z.string().min(7, "Please enter a phone number").max(20),
  line1: z.string().min(5, "Please enter the street address").max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2, "Please enter the city").max(80),
  state: z.string().min(2, "Please enter the province or state").max(60),
  postalCode: z.string().max(12).optional(),
  country: z.string().length(2, "Please choose a country"),
});

export async function saveAddress(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = addressSchema.safeParse({
    label: str(fd, "label") || undefined,
    fullName: str(fd, "fullName"),
    phone: str(fd, "phone"),
    line1: str(fd, "line1"),
    line2: str(fd, "line2") || undefined,
    city: str(fd, "city"),
    state: str(fd, "state"),
    postalCode: str(fd, "postalCode").toUpperCase() || undefined,
    country: (str(fd, "country") || "CA").toUpperCase(),
  });
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const id = str(fd, "id");
  const makeDefault = fd.get("isDefault") === "on";
  try {
    if (makeDefault) await db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    if (id) {
      const owned = await db.address.findFirst({ where: { id, userId: user.id } });
      if (!owned) return fail("Address not found.");
      await db.address.update({ where: { id }, data: { ...parsed.data, ...(makeDefault ? { isDefault: true } : {}) } });
    } else {
      const count = await db.address.count({ where: { userId: user.id } });
      await db.address.create({ data: { ...parsed.data, userId: user.id, isDefault: makeDefault || count === 0 } });
    }
    revalidatePath("/account/addresses");
    return { ok: true, message: "Address saved." };
  } catch (err) {
    console.error("[address]", err);
    return fail(FRIENDLY_ERROR);
  }
}

export async function deleteAddress(id: string) {
  const user = await requireUser();
  await db.address.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/account/addresses");
}

export async function setNewsletterPreference(subscribed: boolean) {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { marketingConsent: subscribed } });
  await db.newsletterSubscriber.upsert({
    where: { email: user.email },
    create: { email: user.email, source: "account", status: subscribed ? "SUBSCRIBED" : "UNSUBSCRIBED" },
    update: { status: subscribed ? "SUBSCRIBED" : "UNSUBSCRIBED" },
  });
  revalidatePath("/account");
  return { ok: true };
}
