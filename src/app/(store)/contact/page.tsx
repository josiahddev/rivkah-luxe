import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { SectionHeading } from "@/components/ui/bits";
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from "@/components/ui/icons";
import { ContactForm } from "@/components/store/contact-form";
import { WhatsAppInline } from "@/components/store/whatsapp-button";

export const metadata: Metadata = { title: "Contact", description: "Get in touch with Rivkah Luxe." };

export default async function ContactPage() {
  const s = await getSettings();
  return (
    <div className="container-luxe py-14 sm:py-20">
      <SectionHeading as="h1" eyebrow="Contact" title="We'd love to hear from you" subtitle={s.contact.intro} className="mb-14" />
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1fr_320px] lg:gap-16">
        <ContactForm />
        <aside className="space-y-6 text-sm">
          {s.businessEmail && (
            <p className="flex gap-3"><MailIcon className="shrink-0 text-gold-deep" /><a href={`mailto:${s.businessEmail}`} className="hover:underline">{s.businessEmail}</a></p>
          )}
          {s.phone && (
            <p className="flex gap-3"><PhoneIcon className="shrink-0 text-gold-deep" /><a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:underline">{s.phone}</a></p>
          )}
          {s.address && <p className="flex gap-3"><MapPinIcon className="shrink-0 text-gold-deep" /><span className="whitespace-pre-line">{s.address}</span></p>}
          {s.contact.hours && <p className="flex gap-3"><ClockIcon className="shrink-0 text-gold-deep" />{s.contact.hours}</p>}
          {s.whatsapp && <WhatsAppInline number={s.whatsapp} />}
        </aside>
      </div>
    </div>
  );
}
