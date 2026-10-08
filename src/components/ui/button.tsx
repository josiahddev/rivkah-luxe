import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "gold" | "outline" | "ghost" | "light" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 select-none whitespace-nowrap font-sans font-medium uppercase transition-[background-color,color,border-color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-ivory hover:bg-ink-soft border border-ink",
  gold: "bg-gold text-ink hover:bg-champagne border border-gold",
  outline: "border border-ink text-ink hover:bg-ink hover:text-ivory",
  light: "border border-ivory/70 text-ivory hover:bg-ivory hover:text-ink",
  ghost: "text-ink hover:bg-sand border border-transparent",
  danger: "bg-danger text-white hover:bg-danger/90 border border-danger",
  link: "text-ink underline underline-offset-4 decoration-gold/70 hover:decoration-ink normal-case tracking-normal",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.68rem] tracking-[0.16em]",
  md: "h-12 px-6 text-[0.72rem] tracking-[0.2em]",
  lg: "h-14 px-9 text-[0.75rem] tracking-[0.22em]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], variant !== "link" && sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingText?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, loadingText, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block size-3.5 animate-spin rounded-full border-[1.5px] border-current border-r-transparent", className)}
      aria-hidden="true"
    />
  );
}
