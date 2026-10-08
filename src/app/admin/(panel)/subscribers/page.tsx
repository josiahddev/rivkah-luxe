import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import { AdminEmpty, PageHeader, Pill, td, th } from "@/components/admin/ui";
import { QuickAction } from "@/components/admin/client-ui";
import { unsubscribe } from "@/server/admin/marketing";
import { DownloadIcon } from "@/components/ui/icons";

export const metadata = { title: "Email subscribers" };

export default async function SubscribersPage() {
  await requireAdmin("subscribers");
  const subs = await db.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });
  const active = subs.filter((s) => s.status === "SUBSCRIBED").length;
  return (
    <>
      <PageHeader
        title="Email subscribers"
        description={`${active} people have agreed to receive your emails. Export the list to use in Mailchimp, Klaviyo or similar. Only email people on this list — Canada's anti-spam law (CASL) requires consent.`}
        actions={<a href="/api/admin/subscribers" className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-medium text-ivory"><DownloadIcon size={16} /> Export CSV</a>}
      />
      {subs.length === 0 ? <AdminEmpty title="No subscribers yet." message="People who sign up from your website footer, homepage or checkout appear here." /> : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead><tr><th className={th}>Email</th><th className={th}>Joined</th><th className={th}>From</th><th className={th}>Status</th><th className={th}></th></tr></thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td className={td}>{s.email}{s.isDemo && <span className="ml-2 text-xs text-gold-deep">demo</span>}</td>
                  <td className={`${td} text-stone`}>{formatDate(s.createdAt)}</td>
                  <td className={`${td} text-stone`}>{s.source ?? "—"}</td>
                  <td className={td}>{s.status === "SUBSCRIBED" ? <Pill tone="green">Subscribed</Pill> : <Pill>Unsubscribed</Pill>}</td>
                  <td className={`${td} text-right`}>{s.status === "SUBSCRIBED" && <QuickAction action={() => unsubscribe(s.id)}>Unsubscribe</QuickAction>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
