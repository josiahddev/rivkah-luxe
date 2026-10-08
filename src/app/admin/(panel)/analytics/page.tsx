import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { salesReport } from "@/lib/analytics";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { Card, Help, PageHeader, StatCard } from "@/components/admin/ui";
import { BarList, TrendChart } from "@/components/admin/charts";

export const metadata = { title: "Sales reports" };
const RANGES = [7, 30, 90, 365];

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requireAdmin("analytics");
  const d = Number((await searchParams).days);
  const days = RANGES.includes(d) ? d : 30;
  const [r, settings] = await Promise.all([salesReport(days), getSettings()]);
  const c = settings.currency;
  const m = (n: number) => formatMoney(n, c);
  const abandonedValue = r.abandoned.reduce((s, a) => s + a.value, 0);
  return (
    <>
      <PageHeader title="Sales reports" description={`How your store is doing. Money is shown in ${c}; sales in other currencies are converted with the rate used at the time.`} />
      {/* Date range: one row, above everything it controls */}
      <nav className="mb-6 flex flex-wrap gap-1" aria-label="Date range">
        {RANGES.map((n) => (
          <Link key={n} href={`?days=${n}`} aria-current={days === n ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm ${days === n ? "bg-ink text-ivory" : "border border-line bg-white hover:border-ink"}`}>
            {n === 365 ? "Last 12 months" : `Last ${n} days`}
          </Link>
        ))}
      </nav>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue" value={m(r.revenue)} sub={`${r.orders} paid orders`} />
        <StatCard label="Average order" value={m(r.aov)} />
        <StatCard label="Checkout conversion" value={r.conversion === null ? "—" : `${r.conversion}%`} sub={`${r.orders} orders from ${r.cartsCreated} new bags`} />
        <StatCard label="Repeat customers" value={r.repeat} sub={`of ${r.buyers} buyers ordered more than once`} />
      </div>
      <div className="mt-6 grid gap-6">
        <Card title="Revenue by day">
          <TrendChart data={r.series.map((s) => ({ label: s.label, value: s.revenue }))} currency={c} label={`Daily revenue, last ${days} days`} />
        </Card>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Orders by day">
            <TrendChart data={r.series.map((s) => ({ label: s.label, value: s.orders }))} money={false} height={200} label={`Daily orders, last ${days} days`} />
          </Card>
          <Card title={<span className="flex items-center gap-2">New customer accounts <Help>People who created an account each day. Guests who check out without an account aren&apos;t counted here.</Help></span>}>
            <TrendChart data={r.series.map((s) => ({ label: s.label, value: s.customers }))} money={false} height={200} label={`New customer accounts per day, last ${days} days`} />
            <p className="mt-2 text-sm text-stone">{r.newCustomers} new accounts in this period.</p>
          </Card>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Best-selling products" description="By units sold">
            <BarList rows={r.bestSellers.map((p) => ({ label: p.name, value: p.qty, sub: m(p.revenue), href: p.id ? `/admin/products/${p.id}` : undefined }))} money={false} empty="No sales in this period." />
          </Card>
          <Card title="Sales by category">
            <BarList rows={r.byCategory} currency={c} empty="No sales in this period." />
          </Card>
        </div>
        {r.byCurrency.length > 1 && (
          <Card title="Sales by currency paid" description={`Converted to ${c}`}>
            <BarList rows={r.byCurrency} currency={c} />
          </Card>
        )}
        <Card
          title={<span className="flex items-center gap-2">Abandoned bags <Help>Bags with items that haven&apos;t checked out for over an hour. Only contact people who agreed to marketing emails.</Help></span>}
          description={`${r.abandoned.length} bags worth about ${m(abandonedValue)}`}
        >
          {r.abandoned.length === 0 ? <p className="text-sm text-stone">No abandoned bags right now.</p> : (
            <ul className="-my-3 divide-y divide-line text-sm">
              {r.abandoned.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <span className="min-w-40 font-medium">{a.customer ?? a.email ?? "Guest (no email yet)"}</span>
                  <span className="flex-1 text-stone">{a.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</span>
                  <span className="tabular-nums">{m(a.value)}</span>
                  <span className="text-xs text-stone">{formatDateTime(a.updatedAt)}</span>
                  {a.email && (a.canEmail ? <a href={`mailto:${a.email}`} className="text-xs underline">Email (opted in)</a> : <span className="text-xs text-stone">No marketing consent</span>)}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
