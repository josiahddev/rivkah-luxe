import Link from "next/link";
import { cn } from "@/lib/utils";
import { HelpIcon } from "@/components/ui/icons";

/** Page title with a plain-language description and the main action on the right. */
export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-block text-sm text-stone hover:text-ink">
            ← {back.label}
          </Link>
        )}
        <h1 className="font-display text-[2.2rem] leading-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[0.95rem] text-stone">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, children, className, actions }: { title?: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("rounded-lg border border-line bg-white", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            {title && <h2 className="text-[1.05rem] font-medium">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-stone">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, sub, href, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; href?: string; tone?: "gold" | "red" }) {
  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone">{label}</p>
      <p className={cn("mt-2 font-display text-[2rem] leading-none tabular-nums", tone === "red" && "text-danger", tone === "gold" && "text-gold-deep")}>{value}</p>
      {sub && <p className="mt-2 text-xs text-stone">{sub}</p>}
    </>
  );
  const cls = "block rounded-lg border border-line bg-white p-5 transition-colors";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-ink")}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/** A small "?" that explains something in plain words. Works with mouse, touch and keyboard. */
export function Help({ children, label = "What is this?" }: { children: React.ReactNode; label?: string }) {
  return (
    <details className="group relative inline-block align-middle">
      <summary className="inline-grid size-5 cursor-pointer list-none place-items-center rounded-full text-stone hover:text-ink [&::-webkit-details-marker]:hidden" aria-label={label}>
        <HelpIcon size={17} />
      </summary>
      <div className="absolute left-1/2 z-30 mt-2 w-64 -translate-x-1/2 rounded-md bg-ink p-3 text-xs font-normal normal-case leading-relaxed tracking-normal text-ivory shadow-xl">
        {children}
      </div>
    </details>
  );
}

export function AdminEmpty({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white px-6 py-14 text-center">
      <p className="font-display text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-stone">{message}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "gold" | "green" | "red" | "blue" }) {
  const tones = {
    neutral: "bg-sand text-charcoal",
    gold: "bg-champagne/45 text-gold-deep",
    green: "bg-success-soft text-success",
    red: "bg-danger-soft text-danger",
    blue: "bg-info-soft text-info",
  };
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-line bg-white", className)}>
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export const th = "px-4 py-3 text-xs font-medium uppercase tracking-[0.1em] text-stone bg-cream/60 border-b border-line";
export const td = "px-4 py-3.5 border-b border-line align-middle";

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <form method="get" className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4">{children}</form>;
}

export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-medium text-stone sm:flex-none">
      {label}
      {children}
    </label>
  );
}

export const filterInput = "h-10 rounded-md border border-line bg-white px-3 text-sm text-ink focus:border-ink focus:outline-none";

export function Pager({ page, pages, params }: { page: number; pages: number; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    q.set("page", String(p));
    return `?${q}`;
  };
  return (
    <div className="mt-5 flex items-center justify-between text-sm">
      <span className="text-stone">Page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={href(page - 1)} className="rounded-md border border-line bg-white px-4 py-2 hover:border-ink">Previous</Link>}
        {page < pages && <Link href={href(page + 1)} className="rounded-md border border-line bg-white px-4 py-2 hover:border-ink">Next</Link>}
      </div>
    </div>
  );
}
