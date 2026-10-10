import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { Card, PageHeader } from "@/components/admin/ui";
import { ConfirmAction, QuickAction } from "@/components/admin/client-ui";
import { deleteMessage, setMessageStatus } from "@/server/admin/marketing";

export const metadata = { title: "Message" };

export default async function MessagePage({ params }: PageProps<"/admin/messages/[id]">) {
  await requireAdmin("messages");
  const { id } = await params;
  const [m, s] = await Promise.all([db.contactMessage.findUnique({ where: { id } }), getSettings()]);
  if (!m) notFound();
  if (m.status === "NEW") await db.contactMessage.update({ where: { id }, data: { status: "IN_PROGRESS" } });
  return (
    <>
      <PageHeader title={m.subject} description={`From ${m.name} · ${formatDateTime(m.createdAt)}`} back={{ href: "/admin/messages", label: "Messages" }} />
      <Card>
        <p className="whitespace-pre-line leading-relaxed">{m.message}</p>
        <div className="mt-6 space-y-1 border-t border-line pt-4 text-sm">
          <p><a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="underline">{m.email}</a></p>
          {m.phone && <p>{m.phone} · <a href={whatsappLink(m.phone, `Hello ${m.name.split(" ")[0]}, this is ${s.storeName} replying to your message.`)} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a></p>}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-ivory">Reply by email</a>
          <QuickAction action={setMessageStatus.bind(null, m.id, "RESOLVED")} className="rounded-md border border-line px-4 py-2.5 text-sm hover:border-ink">Mark resolved</QuickAction>
          <QuickAction action={setMessageStatus.bind(null, m.id, "NEW")} className="rounded-md border border-line px-4 py-2.5 text-sm hover:border-ink">Mark as new</QuickAction>
          <ConfirmAction action={deleteMessage.bind(null, m.id)} label="Delete" variant="ghost" className="rounded-md text-danger" title="Delete this message?" message="It will be permanently removed." confirmLabel="Delete" redirectTo="/admin/messages" />
        </div>
      </Card>
    </>
  );
}
