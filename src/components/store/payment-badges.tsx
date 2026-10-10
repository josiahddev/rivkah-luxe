/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

// Brand marks: Visa, Amex, Apple Pay, Google Pay from Simple Icons (CC0), coloured
// in each brand's colour; Mastercard drawn to its official circle spec; Paystack
// logo from Wikimedia Commons. All marks are trademarks of their owners.
const BADGES = [
  { src: "/payments/visa.svg", alt: "Visa", pad: "p-1.5" },
  { src: "/payments/mastercard.svg", alt: "Mastercard", pad: "p-1" },
  { src: "/payments/americanexpress.svg", alt: "American Express", pad: "p-1" },
  { src: "/payments/applepay.svg", alt: "Apple Pay", pad: "p-1" },
  { src: "/payments/googlepay.svg", alt: "Google Pay", pad: "p-1" },
  { src: "/payments/paystack.png", alt: "Paystack", pad: "px-1.5 py-2" },
];

export function PaymentBadges({ className, size = "md" }: { className?: string; size?: "sm" | "md" }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)} aria-label="Accepted payment methods">
      {BADGES.map((b) => (
        <li key={b.alt} className={cn("grid place-items-center rounded-[4px] border border-black/10 bg-white", size === "sm" ? "h-6 w-10" : "h-8 w-12", b.pad)}>
          <img src={b.src} alt={b.alt} title={b.alt} className="max-h-full max-w-full object-contain" loading="lazy" width={40} height={24} />
        </li>
      ))}
    </ul>
  );
}
