import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { AdminEmpty, PageHeader, Pill, td, th } from "@/components/admin/ui";
import { CouponToggle } from "@/components/admin/marketing-forms";

export const metadata = { title: "Discount codes" };

export default async function DiscountsPage() {
  await requireAdmin("discounts");
  const [coupons, settings] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { products: true, categories: true } } } }),
    getSettings(),
  ]);
  const now = new Date();
  const describe = (c: (typeof coupons)[number]) =>
    c.type === "PERCENTAGE" ? `${c.value}% off` : c.type === "FIXED" ? `${formatMoney(c.value, settings.currency)} off` : "Free shipping";
  const state = (c: (typeof coupons)[number]) =>
    !c.isActive ? <Pill>Off</Pill> : c.endsAt && c.endsAt < now ? <Pill tone="red">Expired</Pill> : c.startsAt && c.startsAt > now ? <Pill tone="blue">Scheduled</Pill> : c.usageLimit !== null && c.usedCount >= c.usageLimit ? <Pill tone="red">Used up</Pill> : <Pill tone="green">Active</Pill>;
  return (
    <>
      <PageHeader
        title="Discount codes"
        description="Codes customers type at checkout, like WELCOME10. You can limit them by date, number of uses, minimum spend, or to certain products."
        actions={<Link href="/admin/discounts/new" className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-ivory hover:bg-ink-soft">+ Create code</Link>}
      />
      {coupons.length === 0 ? (
        <AdminEmpty title="No discount codes yet." message="Create a code to share on Instagram, in a thank-you card, or with loyal customers." action={<Link href="/admin/discounts/new" className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-ivory">+ Create code</Link>} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr><th className={th}>Code</th><th className={th}>Discount</th><th className={th}>Rules</th><th className={th}>Used</th><th className={th}>Status</th><th className={th}>On / off</th></tr></thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-cream/40">
                  <td className={td}><Link href={`/admin/discounts/${c.id}`} className="font-mono font-medium tracking-wider hover:underline">{c.code}</Link>{c.description && <span className="block text-xs text-stone">{c.description}</span>}</td>
                  <td className={td}>{describe(c)}</td>
                  <td className={`${td} text-xs text-stone`}>
                    {[c.minOrderAmount && `Min ${formatMoney(c.minOrderAmount, settings.currency)}`, c.firstOrderOnly && "First order only", c.endsAt && `Ends ${formatDate(c.endsAt)}`, (c._count.products || c._count.categories) && "Selected items only"].filter(Boolean).join(" · ") || "Any order"}
                  </td>
                  <td className={td}>{c.usedCount}{c.usageLimit !== null && <span className="text-stone"> / {c.usageLimit}</span>}</td>
                  <td className={td}>{state(c)}</td>
                  <td className={td}><CouponToggle id={c.id} active={c.isActive} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
