import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { StarIcon } from "./icons";

export function Stars({ value, size = 14, className, label = true }: { value: number; size?: number; className?: string; label?: boolean }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-gold", className)} {...(label ? { role: "img", "aria-label": `Rated ${value.toFixed(1)} out of 5` } : { "aria-hidden": true })}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <StarIcon size={size} className="absolute inset-0 text-gold/50" />
          {rounded >= i - 0.5 && (
            <span className="absolute inset-0 overflow-hidden" style={{ width: rounded >= i ? "100%" : "50%" }}>
              <StarIcon size={size} filled />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

export function Price({
  amount,
  compareAt,
  currency = "NGN",
  from,
  className,
  size = "md",
}: {
  amount: number;
  compareAt?: number | null;
  currency?: string;
  from?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const onSale = compareAt && compareAt > amount;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      {from && <span className="text-xs text-stone">From</span>}
      <span className={cn("tabular-nums", size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-[0.95rem]", onSale && "text-gold-deep")}>
        <span className="sr-only">{onSale ? "Sale price " : "Price "}</span>
        {formatMoney(amount, currency)}
      </span>
      {onSale && (
        <s className={cn("tabular-nums text-stone/80", size === "lg" ? "text-base" : "text-xs")}>
          <span className="sr-only">Original price </span>
          {formatMoney(compareAt!, currency)}
        </s>
      )}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "gold" | "green" | "red" | "blue" | "dark";
  className?: string;
}) {
  const tones = {
    neutral: "bg-sand text-charcoal",
    gold: "bg-champagne/40 text-gold-deep",
    green: "bg-success-soft text-success",
    red: "bg-danger-soft text-danger",
    blue: "bg-info-soft text-info",
    dark: "bg-ink text-ivory",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-1 text-[0.66rem] font-medium uppercase tracking-[0.12em]", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="aspect-[4/5] w-full" />
      <Skeleton className="mt-4 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3.5 w-1/3" />
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl", className)}>
      {eyebrow && <p className="eyebrow mb-3 text-gold-deep">{eyebrow}</p>}
      <Tag className="font-display text-[2.1rem] leading-[1.1] sm:text-5xl">{title}</Tag>
      {subtitle && <p className="mt-4 text-[0.95rem] leading-relaxed text-stone">{subtitle}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  icon,
  children,
  className,
}: {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center", className)}>
      {icon && <div className="mb-6 grid size-16 place-items-center rounded-full border border-gold/40 text-gold">{icon}</div>}
      <h2 className="font-display text-3xl leading-tight">{title}</h2>
      {message && <p className="mt-3 text-[0.95rem] leading-relaxed text-stone">{message}</p>}
      {children && <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
