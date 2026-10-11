import Image from "next/image";
import { cn } from "@/lib/utils";

// The full crown + R/L + "RIVKAH LUXE" logo, gold on a transparent background.
// Size it with a height class (e.g. "h-24"); the width follows.
export function BrandLogo({ className, preload }: { className?: string; preload?: boolean }) {
  return <Image src="/brand/logo-full.png" alt="Rivkah Luxe" width={741} height={564} sizes="240px" preload={preload} className={cn("h-24 w-auto", className)} />;
}

export function Logo({ logoUrl, storeName, className, light }: { logoUrl?: string; storeName: string; className?: string; light?: boolean }) {
  if (logoUrl) {
    return (
      <span className={cn("relative block h-10 w-36", className)}>
        <Image src={logoUrl} alt={storeName} fill sizes="144px" className="object-contain" preload />
      </span>
    );
  }
  const [first, ...rest] = storeName.toUpperCase().split(" ");
  return (
    <span className={cn("flex flex-col items-center leading-none", light ? "text-ivory" : "text-ink", className)} aria-label={storeName}>
      <span className="font-display text-[1.35rem] font-medium tracking-[0.42em] sm:text-[1.55rem]" style={{ marginRight: "-0.42em" }}>
        {first}
      </span>
      {rest.length > 0 && (
        <span className="mt-1 text-[0.55rem] font-medium tracking-[0.62em] text-gold-deep" style={{ marginRight: "-0.62em" }}>
          {rest.join(" ")}
        </span>
      )}
    </span>
  );
}
