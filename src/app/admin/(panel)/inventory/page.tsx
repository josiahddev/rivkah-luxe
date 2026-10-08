import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils";
import { AdminEmpty, Card, FilterBar, FilterField, filterInput, PageHeader, Pill, td, th } from "@/components/admin/ui";
import { StockEditor } from "@/components/admin/stock-editor";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Stock" };

const REASON: Record<string, string> = { ORDER: "Sold", RESTOCK: "Restocked", ADJUSTMENT: "Adjusted", ORDER_CANCELLED: "Order cancelled", REFUND: "Refunded", INITIAL: "Opening stock" };

export default async function InventoryPage({ searchParams }: PageProps<"/admin/inventory">) {
  await requireAdmin("inventory");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const filter = typeof sp.filter === "string" ? sp.filter : "";
  const where: Prisma.ProductVariantWhereInput = {
    product: { status: { not: "ARCHIVED" }, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
    ...(q ? {} : {}),
    ...(filter === "out" ? { stock: { lte: 0 } } : {}),
  };
  const [variantsAll, movements] = await Promise.all([
    db.productVariant.findMany({
      where: q ? { OR: [{ ...where }, { sku: { contains: q, mode: "insensitive" } }] } : where,
      include: { product: { select: { id: true, name: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
      orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }],
    }),
    db.inventoryMovement.findMany({ orderBy: { createdAt: "desc" }, take: 15, include: { variant: { include: { product: { select: { name: true } } } }, user: { select: { name: true } } } }),
  ]);
  const variants = filter === "low" ? variantsAll.filter((v) => v.stock <= v.lowStockThreshold) : variantsAll;
  const low = variantsAll.filter((v) => v.stock > 0 && v.stock <= v.lowStockThreshold).length;
  const out = variantsAll.filter((v) => v.stock <= 0).length;

  const status = (v: (typeof variants)[number]) =>
    v.stock <= 0 ? <Pill tone="red">Out of stock</Pill> : v.stock <= v.lowStockThreshold ? <Pill tone="gold">Low</Pill> : <Pill tone="green">In stock</Pill>;

  return (
    <>
      <PageHeader title="Stock" description="How many of each item you have. Stock goes down automatically when an order is paid, and back up if you cancel or refund it." />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="?" className={`rounded-full px-4 py-2 ${!filter ? "bg-ink text-ivory" : "border border-line bg-white"}`}>All ({variantsAll.length})</Link>
        <Link href="?filter=low" className={`rounded-full px-4 py-2 ${filter === "low" ? "bg-ink text-ivory" : "border border-line bg-white"}`}>Low or out ({low + out})</Link>
        <Link href="?filter=out" className={`rounded-full px-4 py-2 ${filter === "out" ? "bg-ink text-ivory" : "border border-line bg-white"}`}>Out of stock ({out})</Link>
      </div>
      <FilterBar>
        <input type="hidden" name="filter" value={filter} />
        <FilterField label="Search"><input name="q" defaultValue={q} placeholder="Product or SKU" className={filterInput} /></FilterField>
        <button className="h-10 rounded-md bg-ink px-5 text-sm font-medium text-ivory">Search</button>
      </FilterBar>

      {variants.length === 0 ? (
        <AdminEmpty title="Nothing to show." message={filter ? "Great — nothing is running low." : "Add products to start tracking stock."} />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead><tr><th className={th}>Product</th><th className={th}>SKU</th><th className={th}>Status</th><th className={th}>Alert at</th><th className={th}>Sold</th><th className={th}>In stock — update</th></tr></thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id} className="hover:bg-cream/40">
                    <td className={td}>
                      <Link href={`/admin/products/${v.product.id}`} className="flex items-center gap-3 hover:underline">
                        <span className="relative h-11 w-9 shrink-0 overflow-hidden rounded bg-sand">{(v.imageUrl || v.product.images[0]?.url) && <Image src={v.imageUrl || v.product.images[0].url} alt="" fill sizes="36px" className="object-cover" />}</span>
                        <span>{v.product.name}{v.name !== "Default" && <span className="block text-xs text-stone">{v.name}</span>}</span>
                      </Link>
                    </td>
                    <td className={`${td} text-xs text-stone`}>{v.sku}</td>
                    <td className={td}>{status(v)}</td>
                    <td className={`${td} text-stone`}>{v.lowStockThreshold}</td>
                    <td className={`${td} text-stone`}>{v.soldCount}</td>
                    <td className={td}><StockEditor variantId={v.id} stock={v.stock} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {variants.map((v) => (
              <li key={v.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{v.product.name}</p>
                    {v.name !== "Default" && <p className="text-sm text-stone">{v.name}</p>}
                    <p className="text-xs text-stone">{v.sku} · sold {v.soldCount}</p>
                  </div>
                  {status(v)}
                </div>
                <div className="mt-3"><StockEditor variantId={v.id} stock={v.stock} /></div>
              </li>
            ))}
          </ul>
        </>
      )}

      <Card title="Recent stock changes" className="mt-8">
        {movements.length === 0 ? <p className="text-sm text-stone">No changes yet.</p> : (
          <ul className="-my-2 divide-y divide-line text-sm">
            {movements.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <span className={`w-12 tabular-nums font-medium ${m.change < 0 ? "text-danger" : "text-success"}`}>{m.change > 0 ? `+${m.change}` : m.change}</span>
                <span className="flex-1">{m.variant.product.name}{m.variant.name !== "Default" ? ` (${m.variant.name})` : ""}</span>
                <span className="text-stone">{REASON[m.reason]}{m.note ? ` · ${m.note}` : ""}{m.user ? ` · ${m.user.name}` : ""}</span>
                <span className="text-xs text-stone">now {m.stockAfter} · {formatDateTime(m.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
