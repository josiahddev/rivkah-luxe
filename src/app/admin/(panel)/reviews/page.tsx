import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils";
import { AdminEmpty, Card, PageHeader, Pill } from "@/components/admin/ui";
import { AddReviewForm, ReviewActions } from "@/components/admin/marketing-forms";
import { Stars } from "@/components/ui/bits";
import type { ReviewStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  await requireAdmin("reviews");
  const sp = await searchParams;
  const tab = (typeof sp.tab === "string" ? sp.tab : "PENDING") as ReviewStatus | "FEATURED";
  const [reviews, counts, products] = await Promise.all([
    db.review.findMany({
      where: tab === "FEATURED" ? { isFeatured: true } : { status: tab },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { product: { select: { name: true, slug: true } } },
    }),
    db.review.groupBy({ by: ["status"], _count: true }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const n = (s: ReviewStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  const tabs = [
    { v: "PENDING", l: `Waiting for approval (${n("PENDING")})` },
    { v: "APPROVED", l: `Published (${n("APPROVED")})` },
    { v: "FEATURED", l: "On homepage" },
    { v: "REJECTED", l: `Hidden (${n("REJECTED")})` },
  ];
  return (
    <>
      <PageHeader title="Reviews" description="New reviews wait here until you approve them. Featured reviews appear on the homepage." />
      <nav className="no-scrollbar mb-5 flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <Link key={t.v} href={`?tab=${t.v}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${tab === t.v ? "bg-ink text-ivory" : "border border-line bg-white hover:border-ink"}`}>{t.l}</Link>
        ))}
      </nav>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          {reviews.length === 0 ? (
            <AdminEmpty title={tab === "PENDING" ? "No reviews waiting." : "Nothing here."} message={tab === "PENDING" ? "You're all caught up. New reviews will appear here." : "Reviews you move here will appear in this list."} />
          ) : (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-lg border border-line bg-white p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={r.rating} />
                    {r.verifiedPurchase && <Pill tone="green">Verified purchase</Pill>}
                    {r.isFeatured && <Pill tone="gold">On homepage</Pill>}
                    {r.isDemo && <span className="text-xs text-gold-deep">demo</span>}
                  </div>
                  {r.title && <p className="mt-2 font-medium">{r.title}</p>}
                  <p className="mt-1 whitespace-pre-line text-sm text-charcoal">{r.comment}</p>
                  <p className="mt-2 text-xs text-stone">
                    {r.name}{r.email ? ` (${r.email})` : ""}{r.location ? ` · ${r.location}` : ""} · {formatDateTime(r.createdAt)} ·{" "}
                    {r.product ? <Link href={`/products/${r.product.slug}`} target="_blank" className="underline">{r.product.name}</Link> : "General testimonial"}
                  </p>
                  <div className="mt-4"><ReviewActions id={r.id} status={r.status} featured={r.isFeatured} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Card title="Add a testimonial" description="For reviews you received by message or in person.">
          <AddReviewForm products={products} />
        </Card>
      </div>
    </>
  );
}
