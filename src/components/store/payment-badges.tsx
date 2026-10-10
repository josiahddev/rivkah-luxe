/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

// Brand marks: Visa, Amex, Apple Pay, Google Pay from Simple Icons (CC0), coloured
// in each brand's colour; Mastercard drawn to its official circle spec; Stripe and
// Paystack logos from Wikimedia Commons. All marks are trademarks of their owners.
// Each SVG's viewBox is cropped to the artwork (scripts/tighten-payment-icons.mjs),
// and every logo gets an optically balanced size inside an identical card.
const BADGES: { src: string; alt: string; w: number; h: number }[] = [
  { src: "/payments/visa.svg", alt: "Visa", w: 42, h: 14 },
  { src: "/payments/mastercard.svg", alt: "Mastercard", w: 38, h: 24 },
  { src: "/payments/americanexpress.svg", alt: "American Express", w: 28, h: 28 },
  { src: "/payments/applepay.svg", alt: "Apple Pay", w: 38, h: 25 },
  { src: "/payments/googlepay.svg", alt: "Google Pay", w: 42, h: 17 },
  { src: "/payments/stripe.svg", alt: "Stripe", w: 40, h: 17 },
  { src: "/payments/paystack.png", alt: "Paystack", w: 54, h: 10 },
];

export function PaymentBadges({ className, size = "md" }: { className?: string; size?: "sm" | "md" }) {
  const k = size === "sm" ? 0.68 : 1;
  return (
    // Phones: a tidy 4-across grid (4 + 3). Larger screens: one row.
    <ul className={cn("grid grid-cols-[repeat(4,max-content)] items-center sm:flex sm:flex-wrap", size === "sm" ? "gap-1.5" : "gap-2", className)} aria-label="Accepted payment methods">
      {BADGES.map((b) => (
        <li
          key={b.alt}
          title={b.alt}
          className={cn(
            "grid shrink-0 place-items-center rounded-md border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
            size === "sm" ? "h-7 w-11" : "h-10 w-16",
          )}
        >
          <img src={b.src} alt={b.alt} width={Math.round(b.w * k)} height={Math.round(b.h * k)} style={{ width: b.w * k, height: b.h * k }} className="object-contain" loading="lazy" />
        </li>
      ))}
    </ul>
  );
}
