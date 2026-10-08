import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import { AdminEmpty, PageHeader, Pill } from "@/components/admin/ui";

export const metadata = { title: "Promotions" };

export default async function PromotionsPage() {
  await requireAdmin("promotions");
  const promos = await db.promotion.findMany({ orderBy: { createdAt: "desc" }, include: { coupon: { select: { code: true } } } });
  const now = new Date();
  const live = (p: (typeof promos)[number]) => p.isActive && (!p.startsAt || p.startsAt <= now) && (!p.endsAt || p.endsAt >= now);
  return (
    <>
      <PageHeader
        title="Promotions"
        description="Seasonal campaigns like Valentine's, Christmas or Black Friday. A live promotion can take over the homepage hero or banner, then disappears on its end date."
        actions={<Link href="/admin/promotions/new" className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-ivory hover:bg-ink-soft">+ New promotion</Link>}
      />
      {promos.length === 0 ? (
        <AdminEmpty title="No promotions yet." message="Plan your next campaign — set the dates and it goes live by itself." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {promos.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/promotions/${p.id}`} className="flex gap-4 rounded-lg border border-line bg-white p-4 hover:border-ink">
                <span className="relative h-24 w-32 shrink-0 overflow-hidden rounded bg-sand">{p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="128px" className="object-cover" />}</span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    {live(p) ? <Pill tone="green">Live now</Pill> : !p.isActive ? <Pill>Off</Pill> : p.endsAt && p.endsAt < now ? <Pill tone="red">Ended</Pill> : <Pill tone="blue">Scheduled</Pill>}
                  </span>
                  <span className="mt-1 block text-sm text-stone">{p.headline}</span>
                  <span className="mt-1 block text-xs text-stone">
                    {[p.showAsHero && "Homepage hero", p.showAsBanner && "Homepage banner", p.coupon && `Code ${p.coupon.code}`].filter(Boolean).join(" · ")}
                  </span>
                  <span className="block text-xs text-stone">{p.startsAt ? formatDate(p.startsAt) : "Now"} → {p.endsAt ? formatDate(p.endsAt) : "no end date"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
