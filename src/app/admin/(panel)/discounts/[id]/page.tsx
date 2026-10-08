import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { minorToInput } from "@/lib/money";
import { PageHeader } from "@/components/admin/ui";
import { CouponForm } from "@/components/admin/marketing-forms";

export const metadata = { title: "Discount code" };

const toLocal = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function CouponPage({ params }: PageProps<"/admin/discounts/[id]">) {
  await requireAdmin("discounts");
  const { id } = await params;
  const isNew = id === "new";
  const [c, products, categories, settings] = await Promise.all([
    isNew ? null : db.coupon.findUnique({ where: { id }, include: { products: { select: { id: true } }, categories: { select: { id: true } } } }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    getSettings(),
  ]);
  if (!isNew && !c) notFound();
  return (
    <>
      <PageHeader title={isNew ? "Create a discount code" : `Code ${c!.code}`} back={{ href: "/admin/discounts", label: "Discount codes" }} description={c ? `Used ${c.usedCount} time${c.usedCount === 1 ? "" : "s"} so far.` : "Customers type this code at checkout."} />
      <CouponForm
        currency={settings.currency}
        products={products}
        categories={categories}
        coupon={
          c
            ? {
                id: c.id, code: c.code, description: c.description ?? "", type: c.type,
                value: c.type === "FIXED" ? minorToInput(c.value) : c.type === "PERCENTAGE" ? String(c.value) : "",
                startsAt: toLocal(c.startsAt), endsAt: toLocal(c.endsAt), usageLimit: c.usageLimit?.toString() ?? "", usageLimitPerCustomer: c.usageLimitPerCustomer?.toString() ?? "",
                minOrderAmount: minorToInput(c.minOrderAmount), firstOrderOnly: c.firstOrderOnly, isActive: c.isActive,
                products: c.products.map((p) => p.id), categories: c.categories.map((x) => x.id),
              }
            : null
        }
      />
    </>
  );
}
