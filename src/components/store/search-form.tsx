"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "@/components/ui/icons";
import { rememberSearch } from "./search-overlay";

export function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  const [q, setQ] = useState(defaultValue);
  const router = useRouter();
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (!q.trim()) return;
        rememberSearch(q);
        router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex items-center gap-3 border-b border-ink pb-2"
    >
      <SearchIcon size={20} className="text-stone" />
      <label htmlFor="search-page-q" className="sr-only">
        Search
      </label>
      <input
        id="search-page-q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products"
        className="h-11 min-w-0 flex-1 bg-transparent text-lg focus:outline-none"
      />
      <button type="submit" className="eyebrow hover:text-gold-deep">
        Search
      </button>
    </form>
  );
}
