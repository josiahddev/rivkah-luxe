import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { can, ROLE_LABELS } from "@/lib/auth/permissions";
import { getSettings } from "@/lib/settings";
import { ADMIN_NAV } from "@/components/admin/nav";
import { AdminSidebar } from "@/components/admin/sidebar";
import { BellIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Dashboard" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin("dashboard");
  const [settings, unread, pendingOrders, pendingReviews, newMessages] = await Promise.all([
    getSettings(),
    db.notification.count({ where: { isRead: false } }),
    db.order.count({ where: { status: "PAYMENT_CONFIRMED" } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.contactMessage.count({ where: { status: "NEW" } }),
  ]);
  const groups = ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(user.role, i.permission)) })).filter((g) => g.items.length);
  const badges: Record<string, number> = { "/admin/orders": pendingOrders, "/admin/reviews": pendingReviews, "/admin/messages": newMessages };

  return (
    <div className="min-h-dvh bg-[#f8f5ef] text-ink">
      <AdminSidebarShell groups={groups} badges={badges} storeName={settings.storeName} userName={user.name} roleLabel={ROLE_LABELS[user.role]} unread={unread} />
      <div className="lg:pl-64">
        <main id="main" className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</main>
      </div>
    </div>
  );
}

function AdminSidebarShell(props: { groups: typeof ADMIN_NAV; badges: Record<string, number>; storeName: string; userName: string; roleLabel: string; unread: number }) {
  return (
    <>
      <AdminSidebar part="desktop" groups={props.groups} badges={props.badges} storeName={props.storeName} userName={props.userName} roleLabel={props.roleLabel} />
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6 lg:ml-64 lg:px-10">
        <div className="flex items-center gap-3">
          <AdminSidebar part="mobile" groups={props.groups} badges={props.badges} storeName={props.storeName} userName={props.userName} roleLabel={props.roleLabel} />
          <Link href="/admin" className="font-display text-xl italic lg:hidden">{props.storeName}</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/products/new" className="hidden rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-ivory hover:bg-ink-soft sm:inline-block">+ Add product</Link>
          <Link href="/admin/notifications" className="relative grid size-11 place-items-center rounded-md border border-line bg-white hover:border-ink" aria-label={`Notifications${props.unread ? `, ${props.unread} unread` : ""}`}>
            <BellIcon size={20} />
            {props.unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[0.65rem] font-medium leading-5 text-white">{props.unread > 99 ? "99+" : props.unread}</span>}
          </Link>
        </div>
      </header>
    </>
  );
}
