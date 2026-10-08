import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { SectionHeading } from "@/components/ui/bits";
import { PlusIcon } from "@/components/ui/icons";
import { ButtonLink } from "@/components/ui/button";
import { WhatsAppInline } from "@/components/store/whatsapp-button";

export const metadata: Metadata = { title: "FAQ", description: "Answers to common questions about orders, shipping, payments and returns." };

export default async function FaqPage() {
  const [items, settings] = await Promise.all([
    db.faqItem.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    getSettings(),
  ]);
  const groups = [...new Set(items.map((i) => i.group))];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } })),
  };
  return (
    <div className="container-luxe py-14 sm:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SectionHeading as="h1" eyebrow="Help" title="Frequently asked questions" className="mb-14" />
      <div className="mx-auto max-w-3xl space-y-14">
        {groups.map((g) => (
          <section key={g} aria-label={g}>
            <h2 className="eyebrow mb-4 text-gold-deep">{g}</h2>
            <div className="border-t border-line">
              {items.filter((i) => i.group === g).map((i) => (
                <details key={i.id} className="accordion border-b border-line">
                  <summary className="flex items-center justify-between gap-6 py-5">
                    <span className="font-display text-xl">{i.question}</span>
                    <PlusIcon size={20} className="accordion-icon shrink-0 text-stone" />
                  </summary>
                  <div className="accordion-body">
                    <div><p className="whitespace-pre-line pb-6 leading-relaxed text-charcoal">{i.answer}</p></div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
        <div className="border border-line bg-cream p-8 text-center">
          <p className="font-display text-2xl">Still have a question?</p>
          <p className="mt-2 text-stone">We&apos;re happy to help.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-5">
            <ButtonLink href="/contact">Contact us</ButtonLink>
            {settings.whatsapp && <WhatsAppInline number={settings.whatsapp} />}
          </div>
        </div>
      </div>
    </div>
  );
}
