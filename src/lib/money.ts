// Prices are stored in minor units (cents / kobo): $32.00 → 3200, ₦15,000 → 1500000.

export type CurrencyConfig = {
  code: string;
  /** How many units of this currency equal 1 unit of the base currency. */
  rate: number;
  /** Round converted prices to this many minor units (1 = nearest cent, 10000 = nearest ₦100). */
  roundTo: number;
  enabled: boolean;
};

export function toMinor(major: number | string): number {
  const n = typeof major === "string" ? Number(major.replace(/[^\d.]/g, "")) : major;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromMinor(minor: number): number {
  return minor / 100;
}

/** Convert an amount in the base currency to another currency using the owner's rate. */
export function convert(minorBase: number, cur: Pick<CurrencyConfig, "rate" | "roundTo">): number {
  if (cur.rate === 1) return minorBase;
  const raw = minorBase * cur.rate;
  const step = Math.max(1, cur.roundTo || 1);
  return Math.round(raw / step) * step;
}

const SYMBOLS: Record<string, string> = { CAD: "$", USD: "US$", NGN: "₦", GBP: "£", EUR: "€", GHS: "GH₵", AUD: "A$" };

export function currencySymbol(code: string) {
  return SYMBOLS[code] ?? `${code} `;
}

export function formatMoney(minor: number, currency = "CAD"): string {
  const major = Math.abs(minor) / 100;
  const hasCents = Math.round(major * 100) % 100 !== 0;
  const formatted = major.toLocaleString("en-CA", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${minor < 0 ? "-" : ""}${currencySymbol(currency)}${formatted}`;
}

/** Value to prefill a price input with, e.g. 3250 → "32.5". */
export function minorToInput(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "";
  return String(minor / 100);
}

export const CURRENCY_NAMES: Record<string, string> = {
  CAD: "Canadian dollar",
  USD: "US dollar",
  NGN: "Nigerian naira",
  GBP: "British pound",
  EUR: "Euro",
};
