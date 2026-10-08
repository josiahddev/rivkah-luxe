"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/server/auth";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/profile", label: "Profile & password" },
];

export function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {LINKS.map((l) => {
        const active = l.href === "/account" ? path === "/account" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn("whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors lg:border-b-0 lg:border-l-2 lg:px-4", active ? "border-gold text-ink" : "border-transparent text-stone hover:text-ink")}
          >
            {l.label}
          </Link>
        );
      })}
      <form action={logout}>
        <button type="submit" className="whitespace-nowrap px-3 py-2.5 text-left text-sm text-stone hover:text-ink lg:px-4 lg:pl-[18px]">
          Sign out
        </button>
      </form>
    </nav>
  );
}
