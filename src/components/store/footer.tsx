import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { FacebookIcon, InstagramIcon, MailIcon, PhoneIcon, TikTokIcon, WhatsAppIcon, XSocialIcon, YouTubeIcon } from "@/components/ui/icons";
import { NewsletterForm } from "./newsletter-form";
import { BrandLogo } from "./logo";
import { whatsappLink } from "@/lib/whatsapp";
import { PaymentBadges } from "./payment-badges";

export async function SiteFooter() {
  const [s, categories] = await Promise.all([
    getSettings(),
    db.category.findMany({ where: { isActive: true, parentId: null }, orderBy: { sortOrder: "asc" }, take: 6, select: { name: true, slug: true } }),
  ]);
  const socials = [
    { href: s.social.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: s.social.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: s.social.tiktok, label: "TikTok", Icon: TikTokIcon },
    { href: s.social.twitter, label: "X (Twitter)", Icon: XSocialIcon },
    { href: s.social.youtube, label: "YouTube", Icon: YouTubeIcon },
  ].filter((x) => x.href);

  const col = "space-y-3 text-[0.9rem] text-mist";
  const heading = "eyebrow mb-5 text-champagne";

  return (
    <footer className="no-print mt-24 bg-ink text-ivory">
      <div className="container-luxe grid gap-12 py-16 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:gap-10 lg:py-20">
        <div className="max-w-sm">
          <BrandLogo className="h-24" />
          <p className="mt-6 text-[0.9rem] leading-relaxed text-mist">{s.footer.blurb}</p>
          <div className="mt-8">
            <p className={heading}>{s.newsletter.heading}</p>
            <NewsletterForm source="footer" dark />
          </div>
        </div>

        <nav aria-label="Shop">
          <p className={heading}>Shop</p>
          <ul className={col}>
            <li><Link className="hover:text-ivory" href="/shop">All products</Link></li>
            {categories.map((c) => (
              <li key={c.slug}><Link className="hover:text-ivory" href={`/category/${c.slug}`}>{c.name}</Link></li>
            ))}
            <li><Link className="hover:text-ivory" href="/shop?sort=newest">New arrivals</Link></li>
          </ul>
        </nav>

        <nav aria-label="Customer service">
          <p className={heading}>Customer care</p>
          <ul className={col}>
            <li><Link className="hover:text-ivory" href="/track-order">Track your order</Link></li>
            <li><Link className="hover:text-ivory" href="/shipping-delivery">Shipping</Link></li>
            <li><Link className="hover:text-ivory" href="/returns-refunds">Returns &amp; refunds</Link></li>
            <li><Link className="hover:text-ivory" href="/faq">FAQ</Link></li>
            <li><Link className="hover:text-ivory" href="/account">My account</Link></li>
          </ul>
        </nav>

        <div>
          <p className={heading}>{s.storeName}</p>
          <ul className={col}>
            <li><Link className="hover:text-ivory" href="/about">About us</Link></li>
            <li><Link className="hover:text-ivory" href="/contact">Contact</Link></li>
            {s.businessEmail && (
              <li><a className="inline-flex items-center gap-2 hover:text-ivory" href={`mailto:${s.businessEmail}`}><MailIcon size={16} />{s.businessEmail}</a></li>
            )}
            {s.phone && (
              <li><a className="inline-flex items-center gap-2 hover:text-ivory" href={`tel:${s.phone.replace(/\s/g, "")}`}><PhoneIcon size={16} />{s.phone}</a></li>
            )}
            {s.whatsapp && (
              <li><a className="inline-flex items-center gap-2 hover:text-ivory" href={whatsappLink(s.whatsapp)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={16} />Chat on WhatsApp</a></li>
            )}
          </ul>
          {socials.length > 0 && (
            <div className="mt-6 flex gap-2">
              {socials.map(({ href, label, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="grid size-10 place-items-center rounded-full border border-ivory/20 text-champagne transition-colors hover:border-champagne hover:text-ivory">
                  <Icon size={17} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-ivory/10">
        <div className="container-luxe flex flex-col gap-5 py-6 text-[0.75rem] text-mist lg:flex-row lg:items-center lg:justify-between">
          <p>© {new Date().getFullYear()} {s.storeName}. All rights reserved. Shipped with care from Canada.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link className="hover:text-ivory" href="/privacy-policy">Privacy</Link>
            <Link className="hover:text-ivory" href="/terms-and-conditions">Terms</Link>
            <Link className="hover:text-ivory" href="/cookie-policy">Cookies</Link>
            <Link className="hover:text-ivory" href="/shipping-delivery">Shipping</Link>
            <Link className="hover:text-ivory" href="/returns-refunds">Returns</Link>
          </nav>
          <PaymentBadges />
        </div>
      </div>
    </footer>
  );
}
