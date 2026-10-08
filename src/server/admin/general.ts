"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";

export async function setOnboardingDismissed(dismissed: boolean) {
  const user = await requireAdmin();
  await db.user.update({ where: { id: user.id }, data: { onboardingDismissed: dismissed } });
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function markAllNotificationsRead() {
  await requireAdmin();
  await db.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
  revalidatePath("/admin", "layout");
  return { ok: true as const, message: "All caught up." };
}

export async function markNotificationRead(id: string) {
  await requireAdmin();
  await db.notification.update({ where: { id }, data: { isRead: true } }).catch(() => {});
  revalidatePath("/admin", "layout");
  return { ok: true as const };
}

export async function clearReadNotifications() {
  await requireAdmin();
  await db.notification.deleteMany({ where: { isRead: true } });
  revalidatePath("/admin/notifications");
  return { ok: true as const, message: "Cleared." };
}
