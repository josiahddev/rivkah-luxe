"use client";

import { useState } from "react";
import { deleteCoupon, deletePromotion, moderateReview, saveCoupon, savePromotion, saveReview, toggleCoupon } from "@/server/admin/marketing";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { StarIcon } from "@/components/ui/icons";
import { currencySymbol } from "@/lib/money";
import { cn } from "@/lib/utils";
import { AdminForm, ConfirmAction, QuickAction, SubmitBar } from "./client-ui";
import { ImageField } from "./image-uploader";
import { Card } from "./ui";

// ───────────── Discount codes ─────────────

type CouponValues = {
  id: string; code: string; description: string; type: string; value: string; startsAt: string; endsAt: string; usageLimit: string;
  usageLimitPerCustomer: string; minOrderAmount: string; firstOrderOnly: boolean; isActive: boolean; products: string[]; categories: string[];
};

export function CouponForm({ coupon: c, products, categories, currency }: { coupon: CouponValues | null; products: { id: string; name: string }[]; categories: { id: string; name: string }[]; currency: string }) {
  const [type, setType] = useState(c?.type ?? "PERCENTAGE");
  const [scope, setScope] = useState(c && (c.products.length || c.categories.length) ? "some" : "all");
  const sym = currencySymbol(currency).trim();
  return (
    <AdminForm action={saveCoupon} redirectTo="/admin/discounts" className="space-y-6">
      {({ pending, errors }) => (
        <>
          {c && <input type="hidden" name="id" value={c.id} />}
          <Card title="The code">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input name="code" label="Code customers type" required defaultValue={c?.code} error={errors.code} inputClassName="uppercase tracking-widest font-mono" placeholder="WELCOME10" />
              <Input name="description" label="Note for yourself (optional)" defaultValue={c?.description} placeholder="e.g. Instagram giveaway" />
            </div>
          </Card>
          <Card title="Discount">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { v: "PERCENTAGE", l: "Percentage off", d: "e.g. 10% off" },
                { v: "FIXED", l: "Amount off", d: `e.g. ${sym}10 off` },
                { v: "FREE_SHIPPING", l: "Free shipping", d: "Shipping becomes free" },
              ].map((o) => (
                <label key={o.v} className={cn("cursor-pointer rounded-md border p-4 text-sm", type === o.v ? "border-ink bg-cream/60" : "border-line")}>
                  <input type="radio" name="type" value={o.v} checked={type === o.v} onChange={() => setType(o.v)} className="mr-2 accent-ink" />
                  <span className="font-medium">{o.l}</span>
                  <span className="mt-1 block text-xs text-stone">{o.d}</span>
                </label>
              ))}
            </div>
            {type !== "FREE_SHIPPING" && (
              <Input
                name="value"
                label={type === "PERCENTAGE" ? "Percentage" : "Amount"}
                required
                defaultValue={c?.value}
                error={errors.value}
                prefix={type === "FIXED" ? sym : undefined}
                inputMode="decimal"
                className="mt-5 max-w-xs"
                hint={type === "PERCENTAGE" ? "A number from 1 to 100." : `In ${currency}. Converted for customers paying in other currencies.`}
              />
            )}
          </Card>
          <Card title="Rules (all optional)">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input name="startsAt" type="datetime-local" label="Starts" defaultValue={c?.startsAt} hint="Leave blank to start now." />
              <Input name="endsAt" type="datetime-local" label="Ends" defaultValue={c?.endsAt} error={errors.endsAt} hint="Leave blank to never expire." />
              <Input name="minOrderAmount" label="Minimum order" prefix={sym} inputMode="decimal" defaultValue={c?.minOrderAmount} />
              <Input name="usageLimit" type="number" min={1} label="Total uses allowed" defaultValue={c?.usageLimit} hint="Blank = unlimited." />
              <Input name="usageLimitPerCustomer" type="number" min={1} label="Uses per customer" defaultValue={c?.usageLimitPerCustomer} hint="Checked by email address." />
            </div>
            <div className="mt-5 space-y-3">
              <Checkbox name="firstOrderOnly" defaultChecked={c?.firstOrderOnly} label="Only for a customer's first order" />
            </div>
            <fieldset className="mt-6">
              <legend className="mb-2 text-sm font-medium">Applies to</legend>
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-2"><input type="radio" checked={scope === "all"} onChange={() => setScope("all")} className="accent-ink" /> Everything</label>
                <label className="flex items-center gap-2"><input type="radio" checked={scope === "some"} onChange={() => setScope("some")} className="accent-ink" /> Only certain products or categories</label>
              </div>
              {scope === "some" && (
                <div className="mt-4 grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-medium text-stone">Categories</p>
                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-line p-3">
                      {categories.map((x) => <Checkbox key={x.id} name="categories" value={x.id} defaultChecked={c?.categories.includes(x.id)} label={x.name} />)}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-stone">Products</p>
                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-line p-3">
                      {products.map((x) => <Checkbox key={x.id} name="products" value={x.id} defaultChecked={c?.products.includes(x.id)} label={x.name} />)}
                    </div>
                  </div>
                </div>
              )}
            </fieldset>
          </Card>
          <Card title="On or off">
            <Checkbox name="isActive" defaultChecked={c?.isActive ?? true} label="This code can be used" description="Untick to pause it without deleting." />
          </Card>
          <SubmitBar
            pending={pending}
            label={c ? "Save code" : "Create code"}
            cancelHref="/admin/discounts"
            extra={c ? <ConfirmAction action={() => deleteCoupon(c.id)} label="Delete code" variant="ghost" className="mr-auto rounded-md text-danger" title={`Delete ${c.code}?`} message="Customers won't be able to use it any more. Past orders keep their discount." confirmLabel="Delete" redirectTo="/admin/discounts" /> : undefined}
          />
        </>
      )}
    </AdminForm>
  );
}

export function CouponToggle({ id, active }: { id: string; active: boolean }) {
  return (
    <QuickAction action={() => toggleCoupon(id, !active)} className={cn("relative h-6 w-11 rounded-full transition-colors", active ? "bg-success" : "bg-line")}>
      <span className="sr-only">{active ? "Turn off" : "Turn on"}</span>
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", active ? "left-[22px]" : "left-0.5")} />
    </QuickAction>
  );
}

// ───────────── Promotions ─────────────

type PromoValues = {
  id: string; name: string; headline: string; subheading: string; imageUrl: string; ctaText: string; ctaLink: string; discountText: string;
  couponId: string; collectionId: string; showAsHero: boolean; showAsBanner: boolean; isActive: boolean; startsAt: string; endsAt: string;
};

export function PromotionForm({ promo: p, coupons, collections }: { promo: PromoValues | null; coupons: { id: string; code: string }[]; collections: { id: string; name: string; slug: string }[] }) {
  return (
    <AdminForm action={savePromotion} redirectTo="/admin/promotions" className="space-y-6">
      {({ pending, errors }) => (
        <>
          {p && <input type="hidden" name="id" value={p.id} />}
          <Card title="Campaign">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input name="name" label="Campaign name (for you)" required defaultValue={p?.name} error={errors.name} placeholder="e.g. Black Friday 2026" />
              <Input name="discountText" label="Small label above the headline" defaultValue={p?.discountText} placeholder="e.g. 20% off everything" />
              <Input name="headline" label="Headline customers see" required defaultValue={p?.headline} error={errors.headline} className="sm:col-span-2" placeholder="The Black Friday Edit" />
              <Textarea name="subheading" label="Supporting text" rows={2} defaultValue={p?.subheading} className="sm:col-span-2" />
              <Input name="ctaText" label="Button text" defaultValue={p?.ctaText} placeholder="Shop the sale" />
              <Input name="ctaLink" label="Button link" defaultValue={p?.ctaLink} placeholder="/shop or /collections/…" hint="Leave blank to use the collection below." />
            </div>
            <div className="mt-5"><ImageField name="imageUrl" label="Photo" defaultValue={p?.imageUrl} aspect="aspect-[16/10]" /></div>
          </Card>
          <Card title="Connect (optional)">
            <div className="grid gap-5 sm:grid-cols-2">
              <Select name="collectionId" label="Collection to send people to" defaultValue={p?.collectionId ?? ""}>
                <option value="">None</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select name="couponId" label="Discount code to mention" defaultValue={p?.couponId ?? ""} hint="Create codes under Discount codes.">
                <option value="">None</option>
                {coupons.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
              </Select>
            </div>
          </Card>
          <Card title="Where & when">
            <div className="space-y-3">
              <Checkbox name="showAsHero" defaultChecked={p?.showAsHero} label="Replace the big homepage hero while it runs" />
              <Checkbox name="showAsBanner" defaultChecked={p?.showAsBanner ?? true} label="Show as the homepage promotional banner" />
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Input name="startsAt" type="datetime-local" label="Starts" defaultValue={p?.startsAt} hint="Blank = now" />
              <Input name="endsAt" type="datetime-local" label="Ends" defaultValue={p?.endsAt} error={errors.endsAt} hint="Blank = until you turn it off" />
            </div>
            <div className="mt-5"><Checkbox name="isActive" defaultChecked={p?.isActive ?? true} label="Promotion is switched on" /></div>
          </Card>
          <SubmitBar
            pending={pending}
            label={p ? "Save promotion" : "Create promotion"}
            cancelHref="/admin/promotions"
            extra={p ? <ConfirmAction action={() => deletePromotion(p.id)} label="Delete" variant="ghost" className="mr-auto rounded-md text-danger" title="Delete this promotion?" message="It will be removed from the homepage." confirmLabel="Delete" redirectTo="/admin/promotions" /> : undefined}
          />
        </>
      )}
    </AdminForm>
  );
}

// ───────────── Reviews ─────────────

export function ReviewActions({ id, status, featured }: { id: string; status: string; featured: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "APPROVED" && <QuickAction action={() => moderateReview(id, "approve")} className="rounded-md bg-success px-3 py-1.5 text-xs font-medium text-white">Approve</QuickAction>}
      {status !== "REJECTED" && <QuickAction action={() => moderateReview(id, "reject")}>Hide</QuickAction>}
      <QuickAction action={() => moderateReview(id, featured ? "unfeature" : "feature")}>{featured ? "Unfeature" : "★ Feature on homepage"}</QuickAction>
      <ConfirmAction action={() => moderateReview(id, "delete")} label="Delete" variant="ghost" className="rounded-md text-danger" title="Delete this review?" message="It will be permanently removed." confirmLabel="Delete" />
    </div>
  );
}

export function AddReviewForm({ products }: { products: { id: string; name: string }[] }) {
  const [rating, setRating] = useState(5);
  return (
    <AdminForm action={saveReview} resetOnSuccess>
      {({ pending, errors }) => (
        <div className="space-y-4">
          <input type="hidden" name="rating" value={rating} />
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`} aria-checked={rating === n} role="radio" className={rating >= n ? "text-gold" : "text-line"}>
                <StarIcon size={24} filled={rating >= n} />
              </button>
            ))}
          </div>
          <Input name="name" label="Customer name" required error={errors.name} placeholder="e.g. Amara O." />
          <Input name="location" label="City (optional)" placeholder="Toronto" />
          <Input name="title" label="Title (optional)" />
          <Textarea name="comment" label="What they said" required rows={3} error={errors.comment} />
          <Select name="productId" label="Product (optional)" hint="Leave blank for a general testimonial.">
            <option value="">General testimonial</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Checkbox name="isFeatured" defaultChecked label="Feature on homepage" />
          <p className="text-xs text-stone">Only add real reviews you have permission to share.</p>
          <Button type="submit" className="rounded-md" loading={pending}>Add review</Button>
        </div>
      )}
    </AdminForm>
  );
}
