import Image from "next/image";
import { cn } from "@/lib/utils";

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
