"use client";

import Link from "next/link";

import { useEffect } from "react";

// Customers never see raw technical errors. Details are logged on the server.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div className="max-w-md">
        <p className="font-display text-5xl italic text-gold-deep">R/L</p>
        <h1 className="mt-6 font-display text-4xl">Something went wrong.</h1>
        <p className="mt-4 text-stone">Please try again. If it keeps happening, contact us and we&apos;ll help.</p>
        {error.digest && <p className="mt-2 text-xs text-mist">Reference: {error.digest}</p>}
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={reset} className="inline-flex h-12 items-center bg-ink px-6 text-[0.72rem] font-medium uppercase tracking-[0.2em] text-ivory hover:bg-ink-soft">Try again</button>
          <Link href="/" className="inline-flex h-12 items-center border border-ink px-6 text-[0.72rem] font-medium uppercase tracking-[0.2em] hover:bg-ink hover:text-ivory">Home</Link>
        </div>
      </div>
    </main>
  );
}
