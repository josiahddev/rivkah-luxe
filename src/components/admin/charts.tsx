"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";

// Single-series charts only (no legend needed — the card title names the series).
// Series colour validated for the light admin surface (lightness, chroma, ≥3:1 contrast).
const SERIES = "#a8740f";
const GRID = "#ece6db";
const AXIS = "#6b6359";

export type Point = { label: string; value: number };

function TooltipBox({ active, payload, label, money, currency }: { active?: boolean; payload?: { value: number }[]; label?: string; money?: boolean; currency: string }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="rounded-md border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <p className="text-sm font-medium tabular-nums text-ink">{money ? formatMoney(v, currency) : v.toLocaleString("en-CA")}</p>
      <p className="mt-0.5 text-stone">{label}</p>
    </div>
  );
}

export function TrendChart({ data, money = true, currency = "CAD", height = 260, label }: { data: Point[]; money?: boolean; currency?: string; height?: number; label: string }) {
  const fmt = (v: number) => (money ? formatMoney(v, currency).replace(/\.00$/, "") : v.toLocaleString("en-CA"));
  return (
    <figure aria-label={label}>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES} stopOpacity={0.22} />
                <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
            <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={64} tickFormatter={fmt} allowDecimals={false} />
            <Tooltip content={<TooltipBox money={money} currency={currency} />} cursor={{ stroke: AXIS, strokeWidth: 1 }} />
            <Area type="monotone" dataKey="value" stroke={SERIES} strokeWidth={2} fill="url(#trendFill)" activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: SERIES }} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-xs text-stone">
        <summary className="cursor-pointer hover:text-ink">Show as table</summary>
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table className="w-full text-left">
            <tbody>
              {data.map((d) => (
                <tr key={d.label} className="border-b border-line">
                  <td className="py-1.5">{d.label}</td>
                  <td className="py-1.5 text-right tabular-nums text-ink">{money ? formatMoney(d.value, currency) : d.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** Horizontal bars with direct value labels — readable without hovering. */
export function BarList({ rows, money = true, currency = "CAD", empty = "No data yet." }: { rows: { label: string; value: number; sub?: string; href?: string }[]; money?: boolean; currency?: string; empty?: string }) {
  if (!rows.length) return <p className="text-sm text-stone">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${money ? formatMoney(r.value, currency) : r.value}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            {r.href ? <a href={r.href} className="truncate hover:underline">{r.label}</a> : <span className="truncate">{r.label}</span>}
            <span className="shrink-0 tabular-nums text-ink">
              {money ? formatMoney(r.value, currency) : r.value.toLocaleString("en-CA")}
              {r.sub && <span className="ml-1.5 text-xs text-stone">{r.sub}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-sand">
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: SERIES }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
