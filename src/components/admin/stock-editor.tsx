"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateStock } from "@/server/admin/products";
import { useToast } from "@/components/ui/toast";

/** Inline "Update stock" control: type the new number, or add a delivery with "+ Restock". */
export function StockEditor({ variantId, stock }: { variantId: string; stock: number }) {
  const [value, setValue] = useState(String(stock));
  const [mode, setMode] = useState<"set" | "add">("set");
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const save = () =>
    start(async () => {
      const n = Number(value);
      const r = await updateStock(variantId, mode, n);
      if (!r.ok) toast(r.error, "error");
      else {
        toast(r.message ?? "Stock updated.");
        setMode("set");
        router.refresh();
      }
    });
  const changed = mode === "add" ? Number(value) !== 0 && value !== "" : Number(value) !== stock;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex items-center gap-2"
    >
      <select value={mode} onChange={(e) => { setMode(e.target.value as "set" | "add"); setValue(e.target.value === "add" ? "" : String(stock)); }} className="h-10 rounded-md border border-line bg-white px-2 text-xs" aria-label="How to change stock">
        <option value="set">Set to</option>
        <option value="add">Add (restock)</option>
      </select>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={mode === "add" ? "+ how many" : ""}
        className="h-10 w-24 rounded-md border border-line bg-white px-3 text-sm tabular-nums focus:border-ink focus:outline-none"
        aria-label="Stock quantity"
      />
      <button type="submit" disabled={pending || !changed} className="h-10 rounded-md bg-ink px-4 text-xs font-medium text-ivory disabled:opacity-30">
        {pending ? "Saving…" : "Update"}
      </button>
    </form>
  );
}
