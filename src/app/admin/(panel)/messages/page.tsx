import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils";
import { AdminEmpty, PageHeader, Pill } from "@/components/admin/ui";
import type { MessageStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Messages" };
const TONE = { NEW: "gold", IN_PROGRESS: "blue", RESOLVED: "green" } as const;
const LABEL = { NEW: "New", IN_PROGRESS: "In progress", RESOLVED: "Resolved" };

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requireAdmin("messages");
  const s = (await searchParams).status;
  const status = typeof s === "string" && s in LABEL ? (s as MessageStatus) : undefined;
  const messages = await db.contactMessage.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeader title="Messages" description="Enquiries sent through your Contact page. Reply by email, then mark them resolved." />
      <nav className="mb-5 flex gap-1">
        {[["", "All"], ["NEW", "New"], ["IN_PROGRESS", "In progress"], ["RESOLVED", "Resolved"]].map(([v, l]) => (
          <Link key={v} href={v ? `?status=${v}` : "?"} className={`rounded-full px-4 py-2 text-sm ${(status ?? "") === v ? "bg-ink text-ivory" : "border border-line bg-white"}`}>{l}</Link>
        ))}
      </nav>
      {messages.length === 0 ? <AdminEmpty title="No messages." message="Messages from your Contact page will appear here." /> : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-white">
          {messages.map((m) => (
            <li key={m.id}>
              <Link href={`/admin/messages/${m.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-cream/40">
                <Pill tone={TONE[m.status]}>{LABEL[m.status]}</Pill>
                <span className={m.status === "NEW" ? "font-medium" : ""}>{m.subject}</span>
                <span className="flex-1 truncate text-sm text-stone">{m.name} · {m.message}</span>
                <span className="text-xs text-stone">{formatDateTime(m.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
