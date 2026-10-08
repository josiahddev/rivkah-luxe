"use client";

import { MinusIcon, PlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function QuantityInput({ value, onChange, max = 20, className }: { value: number; onChange: (n: number) => void; max?: number; className?: string }) {
  return (
    <div className={cn("flex h-12 items-center border border-line bg-white", className)} role="group" aria-label="Quantity">
      <button type="button" className="grid h-full w-11 place-items-center text-stone hover:text-ink disabled:opacity-30" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Decrease quantity">
        <MinusIcon size={15} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(1, n)));
        }}
        className="h-full w-10 bg-transparent text-center tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Quantity"
      />
      <button type="button" className="grid h-full w-11 place-items-center text-stone hover:text-ink disabled:opacity-30" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase quantity">
        <PlusIcon size={15} />
      </button>
    </div>
  );
}
