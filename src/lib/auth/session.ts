import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "./tokens";
import { can, isAdminRole, type Permission } from "./permissions";

export const SESSION_COOKIE = "rl_session";
const SESSION_DAYS = 30;

export async function createSession(userId: string) {
  const token = randomToken();
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt,
      userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
      ip: clientIp(h),
    },
  });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}

export function clientIp(h: Headers) {
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim();
}

/** The signed-in user for this request, or null. Cached per request. */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        select: {
          id: true, email: true, name: true, phone: true, role: true, status: true,
          onboardingDismissed: true, marketingConsent: true,
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date() || session.user.status !== "ACTIVE") return null;
  return session.user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(next = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Server-side guard for every admin page and admin action.
 * Redirects to the admin sign-in page when signed out, and to a "no access"
 * page when the role lacks the permission.
 */
export async function requireAdmin(permission: Permission = "dashboard") {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) redirect("/admin/login");
  if (!can(user.role, permission)) redirect("/admin/no-access");
  return user;
}

/** Same check as requireAdmin, returning null instead of redirecting — for route handlers. */
export async function assertAdmin(permission: Permission = "dashboard") {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role) || !can(user.role, permission)) return null;
  return user;
}
