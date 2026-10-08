"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";
import { Price, Skeleton } from "@/components/ui/bits";
import { popularSearches, searchSuggest } from "@/server/shop";
import type { ProductCardData } from "@/lib/catalog";

const RECENT_KEY = "rl_recent_searches";

export function readRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, 6);
  } catch {
    return [];
  }
}

export function rememberSearch(term: string) {
  try {
    const t = term.trim();
    if (!t) return;
    const list = [t, ...readRecentSearches().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ products: ProductCardData[]; categories: { name: string; slug: string }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    setRecent(readRecentSearches());
    popularSearches().then(setPopular).catch(() => {});
    const r = requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        setResults(await searchSuggest(term));
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const go = (term: string) => {
    if (!term.trim()) return;
    rememberSearch(term);
    onClose();
    router.push(`/search?q=${encodeURIComponent(term.trim())}`);
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[75]" role="dialog" aria-modal="true" aria-label="Search">
      <div className={cn("absolute inset-0 bg-ink/40 transition-opacity duration-300", visible ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div
        className={cn(
          "relative max-h-[100dvh] overflow-y-auto bg-ivory shadow-2xl transition-all duration-500 ease-[var(--ease-luxe)]",
          visible ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0",
        )}
      >
        <div className="container-luxe py-6 sm:py-10">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              go(q);
            }}
            className="flex items-center gap-3 border-b border-ink pb-3"
          >
            <SearchIcon size={22} className="text-stone" />
            <label htmlFor="site-search" className="sr-only">
              Search products
            </label>
            <input
              ref={inputRef}
              id="site-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search body oils, scrubs, gift sets…"
              className="min-w-0 flex-1 bg-transparent font-display text-2xl placeholder:text-mist focus:outline-none sm:text-4xl"
              autoComplete="off"
            />
            <button type="button" onClick={onClose} className="p-2 text-stone hover:text-ink" aria-label="Close search">
              <CloseIcon size={22} />
            </button>
          </form>

          <div className="mt-8 min-h-[180px]" aria-live="polite">
            {!results && !loading && (
              <div className="grid gap-8 sm:grid-cols-2">
                {recent.length > 0 && (
                  <div>
                    <p className="eyebrow mb-3 text-stone">Recent searches</p>
                    <div className="flex flex-wrap gap-2">
                      {recent.map((r) => (
                        <button key={r} onClick={() => go(r)} className="border border-line px-3.5 py-2 text-sm hover:border-ink">
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {popular.length > 0 && (
                  <div>
                    <p className="eyebrow mb-3 text-stone">Popular</p>
                    <div className="flex flex-wrap gap-2">
                      {popular.map((r) => (
                        <button key={r} onClick={() => go(r)} className="bg-sand px-3.5 py-2 text-sm hover:bg-champagne/50">
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {loading && !results && (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <Skeleton className="aspect-[4/5]" />
                    <Skeleton className="mt-3 h-3.5 w-3/4" />
                  </div>
                ))}
              </div>
            )}

            {results && (
              <>
                {results.categories.length > 0 && (
                  <div className="mb-6 flex flex-wrap gap-2">
                    {results.categories.map((c) => (
                      <Link key={c.slug} href={`/category/${c.slug}`} onClick={onClose} className="border border-line px-3.5 py-2 text-sm hover:border-ink">
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}
                {results.products.length === 0 ? (
                  <div className="py-6">
                    <p className="font-display text-2xl">We couldn&apos;t find what you&apos;re looking for.</p>
                    <p className="mt-2 text-sm text-stone">Try a different word, like &ldquo;oil&rdquo;, &ldquo;vanilla&rdquo; or &ldquo;gift&rdquo;.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-5">
                      {results.products.map((p) => (
                        <Link key={p.id} href={`/products/${p.slug}`} onClick={() => { rememberSearch(q); onClose(); }} className="group">
                          <div className="relative aspect-[4/5] overflow-hidden bg-sand">
                            {p.image && <Image src={p.image} alt={p.imageAlt} fill sizes="200px" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
                          </div>
                          <p className="mt-3 font-display text-lg leading-snug group-hover:text-gold-deep">{p.name}</p>
                          <Price amount={p.price} compareAt={p.compareAt} from={p.priceFrom} size="sm" />
                        </Link>
                      ))}
                    </div>
                    <button onClick={() => go(q)} className="eyebrow mt-8 text-gold-deep underline underline-offset-4">
                      See all results for &ldquo;{q}&rdquo;
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
