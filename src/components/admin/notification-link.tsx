"use client";

import Link from "next/link";
import { markNotificationRead } from "@/server/admin/general";

export function NotificationLink({ id, href, unread, children }: { id: string; href: string; unread: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={() => unread && markNotificationRead(id)} className="flex items-center gap-4 px-5 py-4 hover:bg-cream/40">
      {children}
    </Link>
  );
}
