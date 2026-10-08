import "server-only";
import { db } from "@/lib/db";
import type { NotificationType } from "@/generated/prisma/enums";

type Actor = { id: string; name: string } | null;

/** Record an admin action in plain language, e.g. "Rivkah changed Cinnamon Kiss price from ₦8,000 to ₦9,000." */
export async function audit(actor: Actor, action: string, entityType: string, entityId: string | null, summary: string) {
  try {
    await db.auditLog.create({
      data: { userId: actor?.id ?? null, userName: actor?.name ?? "System", action, entityType, entityId, summary },
    });
  } catch (err) {
    console.error("[audit]", err);
  }
}

export async function notifyAdmin(type: NotificationType, title: string, body?: string, link?: string) {
  try {
    await db.notification.create({ data: { type, title, body, link } });
  } catch (err) {
    console.error("[notify]", err);
  }
}
