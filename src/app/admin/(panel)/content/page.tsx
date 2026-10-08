import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Website content" };

const AREAS = [
  { href: "/admin/content/homepage", title: "Homepage", text: "Main photo, headline, buttons, banner, brand story, Instagram photos and the announcement bar." },
  { href: "/admin/content/pages", title: "Pages", text: "About us, Shipping, Returns, Privacy, Terms, Cookies — and any new page you want." },
  { href: "/admin/content/faq", title: "FAQ", text: "Questions and answers shown on the FAQ page." },
  { href: "/admin/promotions", title: "Promotions", text: "Seasonal campaigns that take over the homepage for a set time." },
  { href: "/admin/reviews", title: "Testimonials", text: "Choose which customer reviews appear on the homepage." },
  { href: "/admin/settings", title: "Contact info & footer", text: "Email, phone, WhatsApp, address, opening hours, social links and footer text." },
];

export default async function ContentHub() {
  await requireAdmin("content");
  return (
    <>
      <PageHeader title="Website content" description="Change the words and photos on your website. Changes go live as soon as you save." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AREAS.map((a) => (
          <li key={a.href}>
            <Link href={a.href} className="block h-full rounded-lg border border-line bg-white p-6 transition-colors hover:border-ink">
              <p className="font-display text-2xl">{a.title}</p>
              <p className="mt-2 text-sm text-stone">{a.text}</p>
              <p className="mt-4 text-sm font-medium text-gold-deep">Edit →</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
