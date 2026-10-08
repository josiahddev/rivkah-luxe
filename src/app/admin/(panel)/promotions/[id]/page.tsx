import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/ui";
import { PromotionForm } from "@/components/admin/marketing-forms";

export const metadata = { title: "Promotion" };
const toLocal = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function PromotionPage({ params }: PageProps<"/admin/promotions/[id]">) {
  await requireAdmin("promotions");
  const { id } = await params;
  const isNew = id === "new";
  const [p, coupons, collections] = await Promise.all([
    isNew ? null : db.promotion.findUnique({ where: { id } }),
    db.coupon.findMany({ where: { isActive: true }, select: { id: true, code: true } }),
    db.collection.findMany({ select: { id: true, name: true, slug: true } }),
  ]);
  if (!isNew && !p) notFound();
  return (
    <>
      <PageHeader title={isNew ? "New promotion" : p!.name} back={{ href: "/admin/promotions", label: "Promotions" }} />
      <PromotionForm
        coupons={coupons}
        collections={collections}
        promo={
          p
            ? {
                id: p.id, name: p.name, headline: p.headline, subheading: p.subheading ?? "", imageUrl: p.imageUrl ?? "", ctaText: p.ctaText ?? "", ctaLink: p.ctaLink ?? "",
                discountText: p.discountText ?? "", couponId: p.couponId ?? "", collectionId: p.collectionId ?? "", showAsHero: p.showAsHero, showAsBanner: p.showAsBanner,
                isActive: p.isActive, startsAt: toLocal(p.startsAt), endsAt: toLocal(p.endsAt),
              }
            : null
        }
      />
    </>
  );
}
