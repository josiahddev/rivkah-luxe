import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils";
import { AdminEmpty, PageHeader } from "@/components/admin/ui";
import { QuickAction } from "@/components/admin/client-ui";
import { clearReadNotifications, markAllNotificationsRead } from "@/server/admin/general";
import { NotificationLink } from "@/components/admin/notification-link";

export const metadata = { title: "Notifications" };

const ICON: Record<string, string> = {
  NEW_ORDER: "🛍", PAYMENT_SUCCEEDED: "✓", PAYMENT_FAILED: "✕", LOW_STOCK: "⚠", OUT_OF_STOCK: "⚠", NEW_CUSTOMER: "👤", NEW_REVIEW: "★", NEW_MESSAGE: "✉", ATTENTION: "!",
};

export default async function NotificationsPage() {
  await requireAdmin("dashboard");
  const items = await db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 150 });
  return (
    <>
      <PageHeader
        title="Notifications"
        description="New orders, payments, low stock, new customers, reviews and messages."
        actions={
          <>
            <QuickAction action={markAllNotificationsRead} className="rounded-md border border-line bg-white px-4 py-2.5 text-sm hover:border-ink">Mark all as read</QuickAction>
            <QuickAction action={clearReadNotifications} className="rounded-md border border-line bg-white px-4 py-2.5 text-sm hover:border-ink">Clear read</QuickAction>
          </>
        }
      />
      {items.length === 0 ? <AdminEmpty title="You're all caught up." message="We'll let you know here when something needs your attention." /> : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-white">
          {items.map((n) => (
            <li key={n.id} className={n.isRead ? "" : "bg-champagne/10"}>
              <NotificationLink id={n.id} href={n.link ?? "/admin"} unread={!n.isRead}>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sand text-sm" aria-hidden="true">{ICON[n.type] ?? "•"}</span>
                <span className="min-w-0 flex-1">
                  <span className={n.isRead ? "" : "font-medium"}>{n.title}</span>
                  {n.body && <span className="block truncate text-sm text-stone">{n.body}</span>}
                </span>
                <span className="text-xs text-stone">{formatDateTime(n.createdAt)}</span>
              </NotificationLink>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm text-stone">Tip: add an email under <Link href="/admin/settings" className="underline">Settings</Link> to also get new-order alerts by email.</p>
    </>
  );
}
