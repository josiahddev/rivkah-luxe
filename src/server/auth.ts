"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyAllSessions, destroySession, getCurrentUser } from "@/lib/auth/session";
import { randomToken, sha256 } from "@/lib/auth/tokens";
import { isAdminRole } from "@/lib/auth/permissions";
import { mergeGuestCart } from "@/lib/cart";
import { rateLimit } from "@/lib/rate-limit";
import { fail, FRIENDLY_ERROR, str, zodFieldErrors, type ActionResult } from "@/lib/action";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmail, welcomeEmail } from "@/lib/email/templates";
import { getSettings } from "@/lib/settings";
import { notifyAdmin } from "@/lib/audit";
import { siteUrl } from "@/lib/utils";

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200)
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Include at least one letter and one number");

function safeNext(next: string, fallback: string) {
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

export async function login(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const email = str(fd, "email").toLowerCase();
  const pw = String(fd.get("password") ?? "");
  const next = safeNext(str(fd, "next"), "/account");
  if (!email || !pw) return fail("Please enter your email and password.");
  if (!(await rateLimit("login", 10, 900)) || !(await rateLimit("login-email", 8, 900, email)))
    return fail("Too many sign-in attempts. Please wait 15 minutes and try again.");

  const user = await db.user.findUnique({ where: { email } });
  const valid = await verifyPassword(pw, user?.passwordHash);
  if (!user || !valid) return fail("That email and password don't match. Please try again.");
  if (user.status !== "ACTIVE") return fail("This account has been suspended. Please contact us for help.");

  await createSession(user.id);
  await mergeGuestCart(user.id, user.email);
  redirect(next);
}

export async function adminLogin(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const email = str(fd, "email").toLowerCase();
  const pw = String(fd.get("password") ?? "");
  if (!email || !pw) return fail("Please enter your email and password.");
  if (!(await rateLimit("admin-login", 8, 900)) || !(await rateLimit("admin-login-email", 6, 900, email)))
    return fail("Too many sign-in attempts. Please wait 15 minutes and try again.");
  const user = await db.user.findUnique({ where: { email } });
  const valid = await verifyPassword(pw, user?.passwordHash);
  if (!user || !valid || !isAdminRole(user.role)) return fail("That email and password don't match an admin account.");
  if (user.status !== "ACTIVE") return fail("This account has been suspended.");
  await createSession(user.id);
  redirect("/admin");
}

const registerSchema = z.object({
  name: z.string().min(2, "Please enter your name").max(100),
  email: z.email("Please enter a valid email address"),
  phone: z.string().max(30).optional(),
  password,
});

export async function register(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    name: str(fd, "name"),
    email: str(fd, "email").toLowerCase(),
    phone: str(fd, "phone") || undefined,
    password: String(fd.get("password") ?? ""),
  });
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error.issues));
  if (!(await rateLimit("register", 5, 3600))) return fail("Too many new accounts from this device. Please try again later.");
  const next = safeNext(str(fd, "next"), "/account");
  const marketing = fd.get("marketing") === "on";

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return fail("An account with this email already exists.", { email: "Already registered — try signing in instead." });

  try {
    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        passwordHash: await hashPassword(parsed.data.password),
        marketingConsent: marketing,
      },
    });
    // Link earlier guest orders placed with this email.
    await db.order.updateMany({ where: { email: user.email, userId: null }, data: { userId: user.id } });
    if (marketing) {
      await db.newsletterSubscriber.upsert({ where: { email: user.email }, create: { email: user.email, source: "registration" }, update: { status: "SUBSCRIBED" } });
    }
    await createSession(user.id);
    await mergeGuestCart(user.id, user.email);
    const settings = await getSettings();
    await sendEmail({ to: user.email, ...welcomeEmail(settings, user.name) });
    await notifyAdmin("NEW_CUSTOMER", "New customer registered", `${user.name} (${user.email})`, `/admin/customers/${user.id}`);
  } catch (err) {
    console.error("[register]", err);
    return fail(FRIENDLY_ERROR);
  }
  redirect(next);
}

export async function logout() {
  const user = await getCurrentUser();
  await destroySession();
  redirect(user && isAdminRole(user.role) ? "/admin/login" : "/");
}

export async function forgotPassword(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const email = str(fd, "email").toLowerCase();
  if (!z.email().safeParse(email).success) return fail("Please enter a valid email address.");
  if (!(await rateLimit("forgot", 5, 3600)) || !(await rateLimit("forgot-email", 3, 3600, email)))
    return fail("Too many requests. Please try again in an hour.");
  const user = await db.user.findUnique({ where: { email } });
  if (user && user.status === "ACTIVE") {
    const token = randomToken();
    await db.passwordResetToken.create({
      data: { tokenHash: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const settings = await getSettings();
    await sendEmail({ to: user.email, ...passwordResetEmail(settings, user.name, siteUrl(`/reset-password?token=${token}`)) });
  }
  // Same message whether or not the email exists, so accounts can't be discovered.
  return { ok: true, message: "If an account exists for that email, we've sent a link to reset your password. It's valid for 1 hour." };
}

export async function resetPassword(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const token = str(fd, "token");
  const pw = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const parsed = password.safeParse(pw);
  if (!parsed.success) return fail(parsed.error.issues[0].message, { password: parsed.error.issues[0].message });
  if (pw !== confirm) return fail("The two passwords don't match.", { confirm: "Passwords don't match" });
  if (!(await rateLimit("reset", 10, 3600))) return fail("Too many attempts. Please try again later.");
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return fail("This reset link has expired. Please request a new one.");
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(pw) } }),
    db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  await destroyAllSessions(row.userId);
  await createSession(row.userId);
  redirect(isAdminRole(row.user.role) ? "/admin" : "/account?reset=1");
}
