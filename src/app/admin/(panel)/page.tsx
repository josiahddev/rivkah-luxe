import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { dashboardStats, salesReport } from "@/lib/analytics";
import { setupSteps } from "@/lib/onboarding";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABEL, STATUS_TONE } from "@/lib/order-status";
import { Card, PageHeader, Pill, StatCard } from "@/components/admin/ui";
import { BarList, TrendChart } from "@/components/admin/charts";
import { SetupGuide, ShowGuideButton } from "@/components/admin/onboarding";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const user = await requireAdmin("dashboard");
  const settings = await getSettings();
  const c = settings.currency;
  const seesSales = can(user.role, "analytics");
  const [stats, report, steps] = await Promise.all([dashboardStats(), seesSales ? salesReport(30) : null, setupSteps()]);
  const showGuide = !user.onboardingDismissed && steps.some((s) => !s.done);
  const greeting = (() => {
    const h = Number(new Date().toLocaleString("en-CA", { hour: "numeric", hour12: false, timeZone: settings.timezone }));
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        description="Here's how your store is doing. All money is shown in Canadian dollars."
        actions={!showGuide && steps.some((s) => !s.done) ? <ShowGuideButton /> : undefined}
      />

      {showGuide && <SetupGuide steps={steps} name={user.name.split(" ")[0]} />}

      {seesSales && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Today's sales" value={formatMoney(stats.today.revenue, c)} sub={`${stats.today.orders} orders`} href="/admin/orders" />
          <StatCard label="This week" value={formatMoney(stats.week.revenue, c)} sub={`${stats.week.orders} orders · last 7 days`} href="/admin/analytics?days=7" />
          <StatCard label="This month" value={formatMoney(stats.month.revenue, c)} sub={`${stats.month.orders} orders · last 30 days`} href="/admin/analytics?days=30" />
          <StatCard label="All-time revenue" value={formatMoney(stats.total.revenue, c)} sub={`${stats.total.orders} paid orders`} href="/admin/analytics?days=365" />
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Orders to pack" value={stats.pending} sub="Paid and waiting for you" href="/admin/orders?status=open" tone={stats.pending ? "gold" : undefined} />
        <StatCard label="Products sold" value={stats.productsSold} sub="Units, all time" />
        <StatCard label="Low on stock" value={stats.lowStock.length} sub="At or below alert level" href="/admin/inventory?filter=low" tone={stats.lowStock.length ? "red" : undefined} />
        <StatCard label="Customers" value={stats.customers} sub="With an account" href="/admin/customers" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {report && (
          <Card title="Sales, last 30 days" description="Revenue from paid orders each day">
            <TrendChart data={report.series.map((d) => ({ label: d.label, value: d.revenue }))} currency={c} label="Daily revenue over the last 30 days" />
          </Card>
        )}
        {report && (
          <Card title="Best sellers" description="Last 30 days, by units sold" actions={<Link href="/admin/analytics" className="text-sm text-stone underline underline-offset-4">Full report</Link>}>
            <BarList rows={report.bestSellers.slice(0, 5).map((p) => ({ label: p.name, value: p.qty, sub: formatMoney(p.revenue, c), href: p.id ? `/admin/products/${p.id}` : undefined }))} money={false} empty="No sales in the last 30 days yet." />
          </Card>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Latest orders" actions={<Link href="/admin/orders" className="text-sm text-stone underline underline-offset-4">All orders</Link>}>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-stone">No orders yet. They&apos;ll appear here the moment a customer pays.</p>
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {stats.recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 hover:opacity-80">
                    <span className="font-medium">{o.orderNumber}</span>
                    <span className="flex-1 truncate text-sm text-stone">{o.customerName}</span>
                    <Pill tone={STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Pill>
                    <span className="w-full text-xs text-stone sm:w-auto">{formatDateTime(o.createdAt)}</span>
                    <span className="tabular-nums">{formatMoney(o.total, o.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Running low" description="Restock these soon" actions={<Link href="/admin/inventory" className="text-sm text-stone underline underline-offset-4">Update stock</Link>}>
          {stats.lowStock.length === 0 ? (
            <p className="text-sm text-stone">Everything is well stocked. 🎉</p>
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {stats.lowStock.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <Link href={`/admin/products/${v.product.id}`} className="truncate hover:underline">
                    {v.product.name}{v.name !== "Default" ? ` · ${v.name}` : ""}
                  </Link>
                  <Pill tone={v.stock <= 0 ? "red" : "gold"}>{v.stock <= 0 ? "Out of stock" : `${v.stock} left`}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
