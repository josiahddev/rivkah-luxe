import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getSettings } from "@/lib/settings";
import type { CurrencyConfig } from "@/lib/money";

export const CURRENCY_COOKIE = "rl_currency";

// Default display currency by visitor country (Vercel adds x-vercel-ip-country).
const COUNTRY_CURRENCY: Record<string, string> = { NG: "NGN", US: "USD", GB: "GBP" };

export const enabledCurrencies = cache(async (): Promise<CurrencyConfig[]> => {
  const s = await getSettings();
  const base: CurrencyConfig = { code: s.currency, rate: 1, roundTo: 1, enabled: true };
  const others = s.currencies.filter((c) => c.enabled && c.code !== s.currency && c.rate > 0);
  return [base, ...others];
});

/** The currency this shopper sees prices in. */
export const getDisplayCurrency = cache(async (): Promise<CurrencyConfig> => {
  const list = await enabledCurrencies();
  const jar = await cookies();
  const chosen = jar.get(CURRENCY_COOKIE)?.value;
  const byCookie = list.find((c) => c.code === chosen);
  if (byCookie) return byCookie;
  const h = await headers();
  const country = h.get("x-vercel-ip-country")?.toUpperCase();
  const guess = country ? list.find((c) => c.code === COUNTRY_CURRENCY[country]) : undefined;
  return guess ?? list[0];
});

export async function currencyFor(code: string): Promise<CurrencyConfig> {
  const list = await enabledCurrencies();
  return list.find((c) => c.code === code) ?? list[0];
}
