"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-ivory hover:bg-ink-soft">
      Print / Save as PDF
    </button>
  );
}
