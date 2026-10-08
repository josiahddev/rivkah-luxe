import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { paymentStatusSummary } from "@/lib/payments";
import { emailConfigured } from "@/lib/email/send";
import { storageConfigured } from "@/lib/storage";
import { siteUrl } from "@/lib/utils";
import { Card, PageHeader, Pill } from "@/components/admin/ui";
import { CurrencyForm, PublishForm, SeoForm, SocialForm, StoreDetailsForm, TaxForm } from "@/components/admin/settings-forms";

export const metadata = { title: "Settings" };

const TABS = [
  { v: "store", l: "Store & contact" },
  { v: "payments", l: "Payments" },
  { v: "currency", l: "Currencies" },
  { v: "tax", l: "Tax" },
  { v: "social", l: "Social & WhatsApp" },
  { v: "seo", l: "Search & sharing" },
  { v: "publish", l: "Publish" },
];

function Status({ ok, label }: { ok: boolean; label: string }) {
  return <Pill tone={ok ? "green" : "red"}>{label}</Pill>;
}

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  await requireAdmin("settings");
  const t = (await searchParams).tab;
  const tab = TABS.some((x) => x.v === t) ? (t as string) : "store";
  const [s, demoProducts] = await Promise.all([getSettings(), db.product.count({ where: { isDemo: true } })]);
  const pay = paymentStatusSummary();
  return (
    <>
      <PageHeader title="Settings" description="Store details, payments, currencies, tax and publishing." />
      <nav className="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Settings sections">
        {TABS.map((x) => (
          <Link key={x.v} href={`?tab=${x.v}`} aria-current={tab === x.v ? "page" : undefined} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${tab === x.v ? "bg-ink text-ivory" : "border border-line bg-white hover:border-ink"}`}>{x.l}</Link>
        ))}
      </nav>

      {tab === "store" && <StoreDetailsForm s={s} />}
      {tab === "social" && <SocialForm s={s} />}
      {tab === "currency" && <CurrencyForm s={s} />}
      {tab === "tax" && <TaxForm s={s} />}
      {tab === "seo" && <SeoForm s={s} />}
      {tab === "publish" && <PublishForm open={s.storeOpen} demoProducts={demoProducts} />}
      {tab === "payments" && (
        <div className="space-y-6">
          <Card title="Stripe — cards, Apple Pay, Google Pay" description="For customers paying in CAD, USD and other currencies.">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Status ok={pay.stripe.connected} label={pay.stripe.connected ? `Connected · ${pay.stripe.mode}` : "Not connected"} />
              <Status ok={pay.stripe.webhook} label={pay.stripe.webhook ? "Payment confirmations on" : "Payment confirmations not set up"} />
            </div>
            <p className="mt-4 text-sm text-stone">Webhook address to add in Stripe: <code className="rounded bg-sand px-1.5 py-0.5">{siteUrl("/api/webhooks/stripe")}</code></p>
          </Card>
          <Card title="Paystack — Nigerian customers paying in naira" description="Card, bank transfer and USSD.">
            <Status ok={pay.paystack.connected} label={pay.paystack.connected ? `Connected · ${pay.paystack.mode}` : "Not connected"} />
            <p className="mt-4 text-sm text-stone">Webhook address to add in Paystack: <code className="rounded bg-sand px-1.5 py-0.5">{siteUrl("/api/webhooks/paystack")}</code></p>
          </Card>
          {pay.testMode && (
            <Card title="Test mode is on">
              <p className="text-sm text-stone">Payments are simulated (no real money). Your developer turns this off by removing <code>PAYMENT_TEST_MODE</code>.</p>
            </Card>
          )}
          <Card title="Other services">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-3"><Status ok={emailConfigured()} label={emailConfigured() ? "Connected" : "Not connected"} /> Email sending (order confirmations, password resets)</li>
              <li className="flex items-center gap-3"><Status ok={storageConfigured()} label={storageConfigured() ? "Ready" : "Not connected"} /> Photo storage</li>
            </ul>
          </Card>
          <p className="text-sm text-stone">For security, payment keys are never shown or typed here. They are added once by your developer in the hosting dashboard (see the README, “Payments”). You can see every payment&apos;s status and reference on each order.</p>
        </div>
      )}
    </>
  );
}
