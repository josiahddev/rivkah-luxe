"use client";

import Link from "next/link";

import { useState } from "react";
import { deleteZone, inviteTeamMember, saveStoreSettings, saveZone, setTeamRole } from "@/server/admin/site";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { currencySymbol, CURRENCY_NAMES } from "@/lib/money";
import { CANADIAN_PROVINCES } from "@/lib/regions";
import { AdminForm, ConfirmAction } from "./client-ui";
import { ImageField } from "./image-uploader";
import { Card, Help } from "./ui";
import type { StoreSettings } from "@/lib/settings";

// ───────────── Shipping zones ─────────────

type Zone = { id: string; name: string; countries: string[]; regions: string; fee: string; freeOverAmount: string; estimatedDelivery: string; isFallback: boolean; isActive: boolean; sortOrder: number };

export function ZoneForm({ zone: z, countries, currency }: { zone: Zone | null; countries: { value: string; label: string }[]; currency: string }) {
  const [fallback, setFallback] = useState(z?.isFallback ?? false);
  const [selected, setSelected] = useState<string[]>(z?.countries ?? []);
  const [filter, setFilter] = useState("");
  const sym = currencySymbol(currency).trim();
  return (
    <AdminForm action={saveZone} redirectTo="/admin/shipping">
      {({ pending, errors }) => (
        <div className="space-y-4">
          {z && <input type="hidden" name="id" value={z.id} />}
          {selected.map((c) => <input key={c} type="hidden" name="countries" value={c} />)}
          <Input name="name" label="Zone name" required defaultValue={z?.name} error={errors.name} placeholder="e.g. Canada, Ontario, Europe" />
          <Checkbox name="isFallback" checked={fallback} onChange={(e) => setFallback(e.target.checked)} label="Everywhere else" description="Covers every country not in another zone." />
          {!fallback && (
            <div>
              <p className="mb-1.5 text-[0.78rem] font-medium text-charcoal">Countries</p>
              {selected.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {selected.map((c) => (
                    <button key={c} type="button" onClick={() => setSelected((s) => s.filter((x) => x !== c))} className="rounded-full bg-ink px-2.5 py-1 text-xs text-ivory">{countries.find((x) => x.value === c)?.label ?? c} ×</button>
                  ))}
                </div>
              )}
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Type to find a country…" className="h-10 w-full rounded-md border border-line px-3 text-sm focus:border-ink focus:outline-none" />
              <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-line">
                {countries.filter((c) => !selected.includes(c.value) && c.label.toLowerCase().includes(filter.toLowerCase())).slice(0, 30).map((c) => (
                  <button key={c.value} type="button" onClick={() => { setSelected((s) => [...s, c.value]); setFilter(""); }} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-cream">{c.label}</button>
                ))}
              </div>
              {errors.countries && <p className="mt-1 text-xs text-danger">{errors.countries}</p>}
              <Input name="regions" label="Only these provinces/states (optional)" defaultValue={z?.regions} className="mt-4" hint="Comma-separated codes, e.g. ON, QC — or Lagos, FCT. Leave blank for the whole country." />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input name="fee" label="Shipping fee" required prefix={sym} inputMode="decimal" defaultValue={z?.fee} error={errors.fee} hint="0 = free" />
            <Input name="freeOverAmount" label="Free when order is over" prefix={sym} inputMode="decimal" defaultValue={z?.freeOverAmount} hint="Optional" />
          </div>
          <Input name="estimatedDelivery" label="Delivery time shown to customers" defaultValue={z?.estimatedDelivery} placeholder="3–7 business days" />
          <Input name="sortOrder" type="number" label="Order" defaultValue={z?.sortOrder ?? 0} />
          <Checkbox name="isActive" defaultChecked={z?.isActive ?? true} label="Zone is switched on" />
          <div className="flex gap-2">
            <Button type="submit" className="rounded-md" loading={pending}>{z ? "Save zone" : "Add zone"}</Button>
            {z && <Link href="/admin/shipping" className="px-3 py-3 text-sm text-stone">Cancel</Link>}
          </div>
        </div>
      )}
    </AdminForm>
  );
}

export function DeleteZone({ id, name }: { id: string; name: string }) {
  return <ConfirmAction action={() => deleteZone(id)} label="Delete" variant="ghost" className="rounded-md text-danger" title={`Delete ${name}?`} message="Customers in this area will use your “Everywhere else” zone instead (if you have one)." confirmLabel="Delete" />;
}

// ───────────── Settings ─────────────

function SettingsForm({ section, children, label = "Save" }: { section: string; children: (errors: Record<string, string>) => React.ReactNode; label?: string }) {
  return (
    <AdminForm action={saveStoreSettings}>
      {({ pending, errors }) => (
        <>
          <input type="hidden" name="section" value={section} />
          {children(errors)}
          <div className="mt-6 flex justify-end"><Button type="submit" size="lg" className="rounded-md" loading={pending} loadingText="Saving…">{label}</Button></div>
        </>
      )}
    </AdminForm>
  );
}

export function StoreDetailsForm({ s }: { s: StoreSettings }) {
  return (
    <SettingsForm section="store">
      {(e) => (
        <div className="space-y-6">
          <Card title="Your store">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input name="storeName" label="Store name" required defaultValue={s.storeName} error={e.storeName} />
              <Input name="tagline" label="Tagline" defaultValue={s.tagline} />
              <ImageField name="logoUrl" label="Logo (optional)" defaultValue={s.logoUrl} aspect="aspect-[3/1]" help="Leave empty to use the elegant text logo. Use a transparent PNG for best results." />
              <ImageField name="faviconUrl" label="Browser tab icon (optional)" defaultValue={s.faviconUrl} aspect="aspect-square" help="A small square image. Leave empty to use the R/L monogram." />
            </div>
          </Card>
          <Card title="Contact details" description="Shown in your footer, contact page and emails.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input name="businessEmail" type="email" label="Business email" defaultValue={s.businessEmail} error={e.businessEmail} />
              <Input name="phone" label="Phone" defaultValue={s.phone} />
              <Input name="whatsapp" label="WhatsApp number" defaultValue={s.whatsapp} hint="With country code, e.g. +1 416 555 0100 or +234 803 000 0000. Leave blank to hide WhatsApp buttons." />
              <Input name="hours" label="Opening hours" defaultValue={s.contact.hours} />
              <Textarea name="address" label="Business address" rows={2} defaultValue={s.address} hint="Shown on invoices and the contact page." />
              <Textarea name="contactIntro" label="Contact page intro" rows={2} defaultValue={s.contact.intro} />
            </div>
          </Card>
          <Card title="Emails">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input name="fromName" label="Emails come from (name)" defaultValue={s.email.fromName} />
              <Input name="orderAlertEmail" type="email" label="Send new-order alerts to" defaultValue={s.email.orderAlertEmail} error={e.orderAlertEmail} hint="Leave blank to use the business email." />
            </div>
          </Card>
          <Card title="Footer, newsletter & returns">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input name="footerBlurb" label="Footer text" defaultValue={s.footer.blurb} />
              <Input name="returnsSummary" label="Returns summary (product pages)" defaultValue={s.returnsSummary} />
              <Input name="newsletterHeading" label="Newsletter heading" defaultValue={s.newsletter.heading} />
              <Input name="newsletterText" label="Newsletter text" defaultValue={s.newsletter.text} />
              <Select name="timezone" label="Timezone (for reports)" defaultValue={s.timezone} options={["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax", "America/St_Johns", "Africa/Lagos", "Europe/London"].map((t) => ({ value: t, label: t.replace("_", " ") }))} />
            </div>
          </Card>
        </div>
      )}
    </SettingsForm>
  );
}

export function SocialForm({ s }: { s: StoreSettings }) {
  return (
    <SettingsForm section="social">
      {(e) => (
        <Card title="Social media & WhatsApp" description="Paste the full link to each profile. Leave blank to hide it.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input name="instagram" label="Instagram" defaultValue={s.social.instagram} error={e.instagram} placeholder="https://instagram.com/rivkahluxe" />
            <Input name="tiktok" label="TikTok" defaultValue={s.social.tiktok} error={e.tiktok} />
            <Input name="facebook" label="Facebook" defaultValue={s.social.facebook} error={e.facebook} />
            <Input name="twitter" label="X (Twitter)" defaultValue={s.social.twitter} error={e.twitter} />
            <Input name="youtube" label="YouTube" defaultValue={s.social.youtube} error={e.youtube} />
            <Input name="whatsapp" label="WhatsApp number" defaultValue={s.whatsapp} hint="Adds “Chat with us on WhatsApp” buttons." />
          </div>
        </Card>
      )}
    </SettingsForm>
  );
}

export function CurrencyForm({ s }: { s: StoreSettings }) {
  const base = s.currency;
  const rows = s.currencies.some((c) => c.code === base) ? s.currencies : [{ code: base, rate: 1, roundTo: 1, enabled: true }, ...s.currencies];
  return (
    <SettingsForm section="currency">
      {() => (
        <Card
          title={<span className="flex items-center gap-2">Currencies <Help>Your prices are set in {base}. Customers can switch currency in the header; prices are converted with the rate you set here. Update rates every so often — they don&apos;t change by themselves.</Help></span>}
          description={`Base currency: ${base} (${CURRENCY_NAMES[base] ?? base}). Naira payments go through Paystack; other currencies through Stripe.`}
        >
          <div className="space-y-3">
            {rows.map((c) => (
              <div key={c.code} className="grid items-end gap-3 rounded-md border border-line p-4 sm:grid-cols-[120px_1fr_1fr_auto]">
                <input type="hidden" name="code" value={c.code} />
                <div><p className="text-xs text-stone">Currency</p><p className="font-medium">{c.code}</p><p className="text-xs text-stone">{CURRENCY_NAMES[c.code]}</p></div>
                {c.code === base ? (
                  <>
                    <input type="hidden" name="rate" value="1" />
                    <input type="hidden" name="roundTo" value="1" />
                    <p className="text-sm text-stone sm:col-span-3">Your base currency — product prices are entered in {base}.</p>
                  </>
                ) : (
                  <>
                    <Input name="rate" label={`1 ${base} =`} defaultValue={String(c.rate)} inputMode="decimal" hint={`${c.code} per ${base}`} />
                    <Select name="roundTo" label="Round prices to" defaultValue={String(c.roundTo)} options={[{ value: "1", label: "Nearest cent" }, { value: "100", label: "Whole number" }, { value: "1000", label: "Nearest 10" }, { value: "10000", label: "Nearest 100" }]} />
                    <Checkbox name="enabled" value={c.code} defaultChecked={c.enabled} label="Offer" />
                  </>
                )}
              </div>
            ))}
          </div>
          {/* Disabled inputs aren't submitted, so send the base row's values explicitly. */}
          <input type="hidden" name="enabled" value={base} />
        </Card>
      )}
    </SettingsForm>
  );
}

export function TaxForm({ s }: { s: StoreSettings }) {
  const [mode, setMode] = useState(s.tax.mode);
  return (
    <SettingsForm section="tax">
      {() => (
        <Card
          title={<span className="flex items-center gap-2">Sales tax <Help>In Canada, GST/HST (and PST/QST in some provinces) is charged based on the delivery province. If your sales are under $30,000 a year you may be a “small supplier” and not need to charge it — ask your accountant.</Help></span>}
          description="Tax is added at checkout and shown on receipts. Rates below are typical combined rates — please confirm them with an accountant."
        >
          <div className="space-y-5">
            <Checkbox name="enabled" defaultChecked={s.tax.enabled} label="Charge sales tax" />
            <div className="grid gap-5 sm:grid-cols-2">
              <Input name="label" label="Name on receipts" defaultValue={s.tax.label} hint="e.g. Sales tax, GST/HST" />
              <Select name="mode" label="How to charge" value={mode} onChange={(e) => setMode(e.target.value as "province" | "flat")} options={[{ value: "province", label: "By Canadian province (recommended)" }, { value: "flat", label: "One rate for every order" }]} />
            </div>
            {mode === "flat" ? (
              <Input name="flatRatePercent" label="Tax rate (%)" defaultValue={String(s.tax.flatRatePercent)} inputMode="decimal" className="max-w-xs" />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CANADIAN_PROVINCES.map((p) => (
                  <Input key={p.code} name={`rate_${p.code}`} label={p.name} defaultValue={String(s.tax.provinceRates[p.code] ?? 0)} inputMode="decimal" />
                ))}
                <input type="hidden" name="flatRatePercent" value={s.tax.flatRatePercent} />
              </div>
            )}
            <Checkbox name="chargeInternational" defaultChecked={s.tax.chargeInternational} label="Also charge tax on orders shipped outside Canada" description="Usually off — exports are generally zero-rated." />
          </div>
        </Card>
      )}
    </SettingsForm>
  );
}

export function SeoForm({ s }: { s: StoreSettings }) {
  return (
    <SettingsForm section="seo">
      {() => (
        <Card title="Search engines & sharing" description="Used on pages that don't have their own title and description, and when your site is shared on WhatsApp, Instagram or Facebook.">
          <div className="space-y-5">
            <Input name="defaultTitle" label="Default page title" defaultValue={s.seo.defaultTitle} />
            <Textarea name="defaultDescription" label="Default description" rows={2} defaultValue={s.seo.defaultDescription} />
            <ImageField name="ogImageUrl" label="Sharing image" defaultValue={s.seo.ogImageUrl} aspect="aspect-[1.91/1]" help="1200 × 630 pixels works best." />
          </div>
        </Card>
      )}
    </SettingsForm>
  );
}

export function PublishForm({ open, demoProducts }: { open: boolean; demoProducts: number }) {
  return (
    <SettingsForm section="publish" label="Save">
      {() => (
        <Card title="Publish your store" description={open ? "Your store is live — customers can see it and buy." : "Your store is hidden. Visitors see a “coming soon” page; you can still see everything while signed in."}>
          {demoProducts > 0 && <p className="mb-4 rounded-md bg-champagne/20 p-3 text-sm">You still have {demoProducts} demo products. Delete them under Products (or ask your developer to run the remove-demo command) before launching.</p>}
          <Checkbox name="storeOpen" defaultChecked={open} label="Store is open to customers" />
        </Card>
      )}
    </SettingsForm>
  );
}

// ───────────── Team ─────────────

export function InviteForm() {
  return (
    <AdminForm action={inviteTeamMember} resetOnSuccess>
      {({ pending, errors }) => (
        <div className="space-y-4">
          <Input name="name" label="Name" required error={errors.name} />
          <Input name="email" type="email" label="Email" required error={errors.email} />
          <Select name="role" label="Access" defaultValue="STORE_MANAGER" options={[{ value: "STORE_MANAGER", label: "Store Manager" }, { value: "CONTENT_MANAGER", label: "Content Manager" }, { value: "SUPER_ADMIN", label: "Owner (full access)" }]} />
          <Input name="password" type="text" label="Temporary password" required error={errors.password} hint="At least 10 characters. Share it privately; they can change it with “Forgot password”." autoComplete="off" />
          <Button type="submit" className="rounded-md" loading={pending}>Add to team</Button>
        </div>
      )}
    </AdminForm>
  );
}

export function RoleSelect({ userId, role, isSelf }: { userId: string; role: string; isSelf: boolean }) {
  if (isSelf) return <span className="text-xs text-stone">You</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {role !== "SUPER_ADMIN" && <ConfirmAction action={() => setTeamRole(userId, "SUPER_ADMIN")} label="Make owner" variant="outline" className="rounded-md" title="Give full access?" message="They'll be able to change settings, payments and the team." confirmLabel="Give full access" />}
      {role !== "STORE_MANAGER" && <ConfirmAction action={() => setTeamRole(userId, "STORE_MANAGER")} label="Store Manager" variant="outline" className="rounded-md" title="Change to Store Manager?" message="Products, stock, orders, customers, discounts, shipping and reports." confirmLabel="Change" />}
      {role !== "CONTENT_MANAGER" && <ConfirmAction action={() => setTeamRole(userId, "CONTENT_MANAGER")} label="Content Manager" variant="outline" className="rounded-md" title="Change to Content Manager?" message="Website content, banners, promotions, reviews and photos." confirmLabel="Change" />}
      <ConfirmAction action={() => setTeamRole(userId, "CUSTOMER")} label="Remove access" className="rounded-md" title="Remove dashboard access?" message="They'll keep their customer account but can't open the dashboard." confirmLabel="Remove access" />
    </div>
  );
}
