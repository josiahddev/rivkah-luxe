import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils";
import { AdminEmpty, FilterBar, FilterField, filterInput, PageHeader, Pager } from "@/components/admin/ui";

export const metadata = { title: "Activity log" };
const PER_PAGE = 50;

export default async function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  await requireAdmin("activity");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const where = q ? { OR: [{ summary: { contains: q, mode: "insensitive" as const } }, { userName: { contains: q, mode: "insensitive" as const } }] } : {};
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    db.auditLog.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="Activity log" description="A record of important changes made in the dashboard — who did what, and when." />
      <FilterBar>
        <FilterField label="Search"><input name="q" defaultValue={q} placeholder="e.g. price, Cinnamon, Rivkah" className={filterInput} /></FilterField>
        <button className="h-10 rounded-md bg-ink px-5 text-sm font-medium text-ivory">Search</button>
      </FilterBar>
      {logs.length === 0 ? <AdminEmpty title="No activity yet." message="Changes you make in the dashboard will be listed here." /> : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-white">
          {logs.map((l) => (
            <li key={l.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 text-sm">
              <span className="w-40 shrink-0 text-xs text-stone">{formatDateTime(l.createdAt)}</span>
              <span className="flex-1">{l.summary}</span>
              <span className="text-xs text-stone">{l.action}</span>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pages={Math.ceil(total / PER_PAGE)} params={{ q }} />
    </>
  );
}
