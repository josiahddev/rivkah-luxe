"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setOnboardingDismissed } from "@/server/admin/general";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { SetupStep } from "@/lib/onboarding";

export function SetupGuide({ steps, name }: { steps: SetupStep[]; name: string }) {
  const [pending, start] = useTransition();
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  return (
    <section className="mb-8 overflow-hidden rounded-lg border border-gold/50 bg-white" aria-labelledby="setup-h">
      <div className="flex flex-wrap items-start justify-between gap-4 bg-ink px-6 py-5 text-ivory">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-champagne">Getting started</p>
          <h2 id="setup-h" className="mt-1 font-display text-3xl">Welcome, {name}. Let&apos;s set up your store.</h2>
          <p className="mt-1 text-sm text-mist">{done} of {steps.length} done{next ? ` — next: ${next.title.toLowerCase()}` : " — you're ready to sell!"}</p>
        </div>
        <button onClick={() => start(() => setOnboardingDismissed(true).then(() => {}))} disabled={pending} className="text-sm text-mist underline underline-offset-4 hover:text-ivory">
          Hide this guide
        </button>
      </div>
      <div className="h-1.5 bg-sand"><div className="h-full bg-gold transition-[width]" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <ol className="divide-y divide-line">
        {steps.map((s, i) => (
          <li key={s.key} className={cn("flex flex-wrap items-center gap-4 px-6 py-4", s === next && "bg-champagne/10")}>
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border text-sm", s.done ? "border-success bg-success text-white" : "border-line text-stone")}>
              {s.done ? <CheckIcon size={16} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("font-medium", s.done && "text-stone line-through decoration-stone/40")}>{s.title}</p>
              <p className="text-sm text-stone">{s.description}</p>
            </div>
            {!s.done && (
              <Link href={s.href} className={cn("rounded-md px-4 py-2.5 text-sm font-medium", s === next ? "bg-ink text-ivory hover:bg-ink-soft" : "border border-line hover:border-ink")}>
                {s.cta}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ShowGuideButton() {
  const [pending, start] = useTransition();
  return (
    <button onClick={() => start(() => setOnboardingDismissed(false).then(() => {}))} disabled={pending} className="text-sm text-stone underline underline-offset-4 hover:text-ink">
      Show setup guide
    </button>
  );
}
