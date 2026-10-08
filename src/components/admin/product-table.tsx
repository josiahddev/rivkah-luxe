"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bulkProducts, type BulkAction } from "@/server/admin/products";
import { formatMoney } from "@/lib/money";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Pill, td, th } from "./ui";

type Row = {
  id: string; name: string; image: string | null; category: string | null; status: string; isFeatured: boolean; isDemo: boolean; slug: string;
  price: number; priceRange: boolean; stock: number; low: boolean; variants: number; sold: number;
};

const STATUS: Record<string, { label: string; tone: "green" | "neutral" | "red" | "gold" }> = {
  PUBLISHED: { label: "Live", tone: "green" },
  DRAFT: { label: "Draft", tone: "neutral" },
  OUT_OF_STOCK: { label: "Out of stock", tone: "red" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
};

export function ProductTable({ rows, categories, currency }: { rows: Row[]; categories: { id: string; name: string }[]; currency: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<BulkAction | "">("");
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const all = rows.length > 0 && selected.size === rows.length;
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const run = () =>
    start(async () => {
      if (!action) return;
      const r = await bulkProducts([...selected], action, value);
      setConfirm(false);
      if (!r.ok) toast(r.error, "error");
      else {
        toast(r.message ?? "Done.");
        setSelected(new Set());
        setAction("");
        setValue("");
        router.refresh();
      }
    });

  return (
    <>
      {selected.size > 0 && (
        <div className="sticky top-16 z-30 mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-ink bg-ink p-3 text-sm text-ivory">
          <span className="font-medium">{selected.size} selected</span>
          <select value={action} onChange={(e) => { setAction(e.target.value as BulkAction); setValue(""); }} className="h-9 rounded-md bg-white px-2 text-ink">
            <option value="">Choose an action…</option>
            <option value="publish">Make live</option>
            <option value="draft">Move to draft</option>
            <option value="archive">Archive</option>
            <option value="feature">Feature on homepage</option>
            <option value="unfeature">Remove from homepage</option>
            <option value="category">Change category</option>
            <option value="stock-set">Set stock to…</option>
            <option value="stock-add">Add stock (restock)…</option>
            <option value="delete">Delete</option>
          </select>
          {action === "category" && (
            <select value={value} onChange={(e) => setValue(e.target.value)} className="h-9 rounded-md bg-white px-2 text-ink">
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {(action === "stock-set" || action === "stock-add") && (
            <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Quantity" className="h-9 w-28 rounded-md bg-white px-2 text-ink" />
          )}
          <button disabled={!action || pending} onClick={() => (action === "delete" ? setConfirm(true) : run())} className="h-9 rounded-md bg-gold px-4 font-medium text-ink disabled:opacity-50">
            {pending ? "Working…" : "Apply"}
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-mist underline">Clear</button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className={`${th} w-10`}>
                <input type="checkbox" checked={all} onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))} aria-label="Select all" className="size-4 accent-ink" />
              </th>
              <th className={th}>Product</th>
              <th className={th}>Status</th>
              <th className={th}>Price</th>
              <th className={th}>Stock</th>
              <th className={th}>Sold</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-cream/40">
                <td className={td}>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} className="size-4 accent-ink" />
                </td>
                <td className={td}>
                  <Link href={`/admin/products/${r.id}`} className="flex items-center gap-3">
                    <span className="relative h-14 w-11 shrink-0 overflow-hidden rounded bg-sand">{r.image && <Image src={r.image} alt="" fill sizes="44px" className="object-cover" />}</span>
                    <span>
                      <span className="font-medium hover:underline">{r.name}</span>
                      <span className="block text-xs text-stone">
                        {r.category ?? "No category"}{r.variants > 1 ? ` · ${r.variants} options` : ""}{r.isFeatured ? " · ★ Featured" : ""}
                      </span>
                    </span>
                    {r.isDemo && <Pill tone="gold">Demo</Pill>}
                  </Link>
                </td>
                <td className={td}><Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill></td>
                <td className={`${td} tabular-nums`}>{r.priceRange && <span className="text-xs text-stone">from </span>}{formatMoney(r.price, currency)}</td>
                <td className={td}>
                  <span className={r.stock === 0 ? "text-danger" : r.low ? "text-gold-deep" : ""}>{r.stock}</span>
                  {r.low && r.stock > 0 && <span className="ml-1 text-xs text-gold-deep">low</span>}
                </td>
                <td className={`${td} tabular-nums text-stone`}>{r.sold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-lg border border-line bg-white p-3">
            <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} className="size-5 shrink-0 accent-ink" />
            <Link href={`/admin/products/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="relative h-16 w-13 shrink-0 overflow-hidden rounded bg-sand">{r.image && <Image src={r.image} alt="" fill sizes="52px" className="object-cover" />}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.name}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone">
                  <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>
                  {formatMoney(r.price, currency)} · <span className={r.stock === 0 ? "text-danger" : r.low ? "text-gold-deep" : ""}>{r.stock} in stock</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={confirm}
        title={`Delete ${selected.size} product${selected.size > 1 ? "s" : ""}?`}
        message="This can't be undone. Past orders will still show these products. If you might sell them again, choose “Archive” instead."
        confirmLabel="Delete"
        loading={pending}
        onCancel={() => setConfirm(false)}
        onConfirm={run}
      />
    </>
  );
}
