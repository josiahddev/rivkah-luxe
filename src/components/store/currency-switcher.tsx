"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setCurrency } from "@/server/cart";
import { cn } from "@/lib/utils";
import { useCart } from "./cart-context";

export function CurrencySwitcher({ current, options, className, dark }: { current: string; options: string[]; className?: string; dark?: boolean }) {
  const router = useRouter();
  const { refresh } = useCart();
  const [pending, start] = useTransition();
  if (options.length < 2) return null;
  return (
    <label className={cn("relative inline-flex items-center", pending && "opacity-50", className)}>
      <span className="sr-only">Currency</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const code = e.target.value;
          start(async () => {
            await setCurrency(code);
            await refresh();
            router.refresh();
          });
        }}
        className={cn(
          "cursor-pointer appearance-none bg-transparent py-1 pr-4 text-[0.68rem] font-medium uppercase tracking-[0.16em] focus:outline-none",
          dark ? "text-mist hover:text-ivory [&>option]:text-ink" : "text-ink hover:text-gold-deep",
        )}
        aria-label="Choose currency"
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-0 size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}
