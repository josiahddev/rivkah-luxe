import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Store timezone for dates shown to customers and the owner. Set NEXT_PUBLIC_STORE_TIMEZONE to change.
export const STORE_TZ = process.env.NEXT_PUBLIC_STORE_TIMEZONE || "America/Toronto";

export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: STORE_TZ, ...opts });
}

export function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString("en-CA", {
    timeZone: STORE_TZ,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function siteUrl(path = "") {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const base = (process.env.NEXT_PUBLIC_SITE_URL || (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/$/, "");
  return `${base}${path}`;
}

export function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

export function stripHtml(html: string | null | undefined) {
  return (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
