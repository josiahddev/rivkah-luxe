"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Drawer } from "@/components/ui/dialog";
import { BagIcon, ChevronRight, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/ui/icons";
import { useCart } from "./cart-context";
import { Logo } from "./logo";
import { SearchOverlay } from "./search-overlay";
import { AnnouncementBar } from "./announcement";
import { CurrencySwitcher } from "./currency-switcher";

type Cat = { name: string; slug: string; imageUrl: string | null };
type Col = { name: string; slug: string };

export function HeaderClient({
  storeName,
  logoUrl,
  announcements,
  announcementLink,
  categories,
  collections,
  signedIn,
  userName,
  isAdmin,
  currency,
  currencies,
}: {
  storeName: string;
  logoUrl: string;
  announcements: string[];
  announcementLink: string;
  categories: Cat[];
  collections: Col[];
  signedIn: boolean;
  userName: string | null;
  isAdmin: boolean;
  currency: string;
  currencies: string[];
}) {
  const { count, open: openCart, bump } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mega, setMega] = useState<"shop" | "collections" | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setMega(null);
    setSearchOpen(false);
  }, [pathname]);

  const navLink = "eyebrow relative py-2 text-[0.68rem] text-ink transition-colors hover:text-gold-deep";

  return (
    <>
      <a href="#main" className="sr-only z-[90] bg-ink px-4 py-2 text-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      {announcements.length > 0 && <AnnouncementBar messages={announcements} link={announcementLink} />}
      <header
        className={cn(
          "sticky top-0 z-50 border-b bg-ivory/95 backdrop-blur-md transition-[border-color,box-shadow] duration-500",
          scrolled ? "border-line shadow-[0_8px_30px_-20px_rgba(15,14,12,0.35)]" : "border-transparent",
        )}
        onMouseLeave={() => setMega(null)}
      >
        <div className={cn("container-luxe grid grid-cols-[1fr_auto_1fr] items-center transition-[height] duration-500", scrolled ? "h-16" : "h-[72px] lg:h-20")}>
          {/* Left: mobile menu / desktop nav */}
          <div className="flex items-center gap-1">
            <button className="-ml-2 p-2 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}>
              <MenuIcon size={22} />
            </button>
            <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
              <button
                className={cn(navLink, mega === "shop" && "text-gold-deep")}
                onMouseEnter={() => setMega("shop")}
                onFocus={() => setMega("shop")}
                onClick={() => setMega(mega === "shop" ? null : "shop")}
                aria-expanded={mega === "shop"}
                aria-controls="mega-shop"
              >
                Shop
              </button>
              {collections.length > 0 && (
                <button
                  className={cn(navLink, mega === "collections" && "text-gold-deep")}
                  onMouseEnter={() => setMega("collections")}
                  onFocus={() => setMega("collections")}
                  onClick={() => setMega(mega === "collections" ? null : "collections")}
                  aria-expanded={mega === "collections"}
                  aria-controls="mega-collections"
                >
                  Collections
                </button>
              )}
              <Link href="/about" className={navLink} onMouseEnter={() => setMega(null)}>
                About
              </Link>
              <Link href="/contact" className={navLink} onMouseEnter={() => setMega(null)}>
                Contact
              </Link>
            </nav>
          </div>

          <Link href="/" className="justify-self-center" aria-label={`${storeName} home`}>
            <Logo logoUrl={logoUrl} storeName={storeName} />
          </Link>

          {/* Right: actions */}
          <div className="flex items-center justify-end gap-0.5 sm:gap-1.5">
            <span className="mr-2 hidden lg:inline-flex"><CurrencySwitcher current={currency} options={currencies} /></span>
            <button className="p-2 transition-colors hover:text-gold-deep" onClick={() => setSearchOpen(true)} aria-label="Search">
              <SearchIcon size={21} />
            </button>
            <Link
              href={isAdmin ? "/admin" : signedIn ? "/account" : "/login"}
              className="hidden p-2 transition-colors hover:text-gold-deep sm:block"
              aria-label={signedIn ? `Account (${userName})` : "Sign in"}
              title={signedIn ? `Hi, ${userName}` : "Sign in"}
            >
              <UserIcon size={21} />
            </Link>
            <Link href="/wishlist" className="hidden p-2 transition-colors hover:text-gold-deep sm:block" aria-label="Wishlist">
              <HeartIcon size={21} />
            </Link>
            <button className="relative -mr-2 p-2 transition-colors hover:text-gold-deep" onClick={openCart} aria-label={`Open bag, ${count} ${count === 1 ? "item" : "items"}`}>
              <BagIcon size={22} />
              {count > 0 && (
                <span
                  key={bump}
                  className="absolute right-0.5 top-0.5 grid min-w-[18px] animate-bump place-items-center rounded-full bg-ink px-1 text-[0.6rem] font-medium leading-[18px] text-ivory"
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Desktop mega menus */}
        <div
          id="mega-shop"
          className={cn(
            "absolute inset-x-0 top-full hidden border-b border-line bg-ivory transition-all duration-400 ease-[var(--ease-luxe)] lg:block",
            mega === "shop" ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
          )}
        >
          <div className="container-luxe grid grid-cols-[220px_1fr] gap-12 py-10">
            <div className="space-y-3">
              <p className="eyebrow text-stone">Shop</p>
              <Link href="/shop" className="block font-display text-2xl hover:text-gold-deep">All products</Link>
              <Link href="/shop?sort=newest" className="block font-display text-2xl hover:text-gold-deep">New arrivals</Link>
              <Link href="/shop?sort=best-selling" className="block font-display text-2xl hover:text-gold-deep">Best sellers</Link>
            </div>
            <div className="grid grid-cols-5 gap-5">
              {categories.slice(0, 5).map((c) => (
                <Link key={c.slug} href={`/category/${c.slug}`} className="group">
                  <div className="relative aspect-[4/5] overflow-hidden bg-sand">
                    {c.imageUrl && (
                      <Image src={c.imageUrl} alt="" fill sizes="200px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    )}
                  </div>
                  <p className="eyebrow mt-3 text-[0.66rem] group-hover:text-gold-deep">{c.name}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
        {collections.length > 0 && (
          <div
            id="mega-collections"
            className={cn(
              "absolute inset-x-0 top-full hidden border-b border-line bg-ivory transition-all duration-400 ease-[var(--ease-luxe)] lg:block",
              mega === "collections" ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
            )}
          >
            <div className="container-luxe flex flex-wrap gap-x-12 gap-y-4 py-9">
              {collections.map((c) => (
                <Link key={c.slug} href={`/collections/${c.slug}`} className="font-display text-2xl hover:text-gold-deep">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Mobile menu */}
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} side="left" title={<Logo storeName={storeName} className="scale-90" />}>
        <nav aria-label="Mobile" className="flex flex-col px-5 py-4">
          <MobileLink href="/shop">Shop all</MobileLink>
          {categories.map((c) => (
            <MobileLink key={c.slug} href={`/category/${c.slug}`}>
              {c.name}
            </MobileLink>
          ))}
          {collections.map((c) => (
            <MobileLink key={c.slug} href={`/collections/${c.slug}`}>
              {c.name}
            </MobileLink>
          ))}
          <div className="my-4 h-px bg-line" />
          <MobileLink href="/about" small>About us</MobileLink>
          <MobileLink href="/contact" small>Contact</MobileLink>
          <MobileLink href="/faq" small>FAQ</MobileLink>
          <MobileLink href="/track-order" small>Track your order</MobileLink>
          <div className="my-4 h-px bg-line" />
          <div className="flex items-center justify-between py-3 text-[0.95rem] text-charcoal">Currency <CurrencySwitcher current={currency} options={currencies} /></div>
          <MobileLink href="/wishlist" small>Wishlist</MobileLink>
          <MobileLink href={isAdmin ? "/admin" : signedIn ? "/account" : "/login"} small>
            {isAdmin ? "Store dashboard" : signedIn ? `My account (${userName})` : "Sign in / Register"}
          </MobileLink>
        </nav>
      </Drawer>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function MobileLink({ href, children, small }: { href: string; children: React.ReactNode; small?: boolean }) {
  return (
    <Link href={href} className={cn("flex items-center justify-between py-3 transition-colors hover:text-gold-deep", small ? "text-[0.95rem] text-charcoal" : "font-display text-2xl")}>
      {children}
      {!small && <ChevronRight size={18} className="text-mist" />}
    </Link>
  );
}
