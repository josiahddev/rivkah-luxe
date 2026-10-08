import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { AdminEmpty, FilterBar, FilterField, filterInput, PageHeader, Pager, Pill, td, th } from "@/components/admin/ui";

export const metadata = { title: "Customers" };
const PER_PAGE = 30;

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdmin("customers");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const where = { role: "CUSTOMER" as const, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }] } : {}) };
  const [users, total, settings] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    db.user.count({ where }),
    getSettings(),
  ]);
  const stats = users.length
    ? await db.order.groupBy({ by: ["email"], where: { email: { in: users.map((u) => u.email) }, paymentStatus: "PAID" }, _count: true, _sum: { baseTotal: true }, _max: { createdAt: true } })
    : [];
  const byEmail = new Map(stats.map((s) => [s.email, s]));
  const guests = await db.order.groupBy({ by: ["email"], where: { userId: null, paymentStatus: "PAID" }, _count: true });

  return (
    <>
      <PageHeader title="Customers" description={`People with an account. ${guests.length} more have checked out as guests — you'll find them in Orders.`} />
      <FilterBar>
        <FilterField label="Search"><input name="q" defaultValue={q} placeholder="Name, email or phone" className={filterInput} /></FilterField>
        <button className="h-10 rounded-md bg-ink px-5 text-sm font-medium text-ivory">Search</button>
      </FilterBar>
      {users.length === 0 ? (
        <AdminEmpty title="No customers found." message={q ? "Try a different search." : "When customers create an account, they appear here."} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr><th className={th}>Customer</th><th className={th}>Phone</th><th className={th}>Orders</th><th className={th}>Total spent</th><th className={th}>Last order</th><th className={th}>Account</th></tr></thead>
            <tbody>
              {users.map((u) => {
                const s = byEmail.get(u.email);
                return (
                  <tr key={u.id} className="hover:bg-cream/40">
                    <td className={td}><Link href={`/admin/customers/${u.id}`} className="font-medium hover:underline">{u.name}</Link><span className="block text-xs text-stone">{u.email}</span></td>
                    <td className={`${td} text-stone`}>{u.phone ?? "—"}</td>
                    <td className={td}>{s?._count ?? 0}</td>
                    <td className={`${td} tabular-nums`}>{formatMoney(s?._sum.baseTotal ?? 0, settings.currency)}</td>
                    <td className={`${td} text-stone`}>{s?._max.createdAt ? formatDate(s._max.createdAt) : "—"}</td>
                    <td className={td}>{u.status === "ACTIVE" ? <Pill tone="green">Active</Pill> : <Pill tone="red">Suspended</Pill>}{u.isDemo && <span className="ml-2 text-xs text-gold-deep">demo</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pages={Math.ceil(total / PER_PAGE)} params={{ q }} />
    </>
  );
}
