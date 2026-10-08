"use client";

import Image from "next/image";
import { useState } from "react";
import { saveProduct } from "@/server/admin/products";
import { AdminForm, SubmitBar } from "./client-ui";
import { DropZone, MediaPicker } from "./image-uploader";
import { RichText } from "./rich-text";
import { Card, Help } from "./ui";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ChevronDown, CloseIcon, ImageIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { currencySymbol } from "@/lib/money";

export type VariantRow = {
  id?: string;
  name: string;
  optionType: string;
  sku: string;
  price: string;
  salePrice: string;
  costPrice: string;
  stock: number;
  lowStockThreshold: number;
  weightGrams: number | null;
  imageUrl: string | null;
  isActive: boolean;
};

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  subcategoryId: string;
  shortDescription: string;
  description: string;
  ingredients: string;
  benefits: string;
  howToUse: string;
  size: string;
  dimensions: string;
  videoUrl: string;
  tags: string;
  status: string;
  isFeatured: boolean;
  seoTitle: string;
  seoDescription: string;
  collections: string[];
  images: { url: string; alt: string }[];
  variants: VariantRow[];
};

const OPTION_TYPES = ["Size", "Volume", "Fragrance", "Colour", "Pack size", "Bundle"];

const STATUS_HELP: Record<string, string> = {
  DRAFT: "Hidden from customers while you work on it.",
  PUBLISHED: "Visible in the shop and can be bought.",
  OUT_OF_STOCK: "Visible, but shows “Out of stock” and can't be bought.",
  ARCHIVED: "Hidden and kept for your records.",
};

export function emptyVariant(): VariantRow {
  return { name: "Default", optionType: "Size", sku: "", price: "", salePrice: "", costPrice: "", stock: 0, lowStockThreshold: 5, weightGrams: null, imageUrl: null, isActive: true };
}

export function ProductForm({
  initial,
  categories,
  collections,
  currency,
  siteUrl,
}: {
  initial: ProductFormValues;
  categories: { id: string; name: string; parentId: string | null }[];
  collections: { id: string; name: string }[];
  currency: string;
  siteUrl: string;
}) {
  const [images, setImages] = useState(initial.images);
  const [variants, setVariants] = useState<VariantRow[]>(initial.variants.length ? initial.variants : [emptyVariant()]);
  const [multi, setMulti] = useState(initial.variants.length > 1 || (initial.variants[0] && initial.variants[0].name !== "Default"));
  const [picking, setPicking] = useState(false);
  const [status, setStatus] = useState(initial.status);
  const [name, setName] = useState(initial.name);
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [seoDesc, setSeoDesc] = useState(initial.seoDescription);
  const [shortDesc, setShortDesc] = useState(initial.shortDescription);
  const sym = currencySymbol(currency).trim();
  const topCats = categories.filter((c) => !c.parentId);
  const subCats = categories.filter((c) => c.parentId);

  const setV = (i: number, patch: Partial<VariantRow>) => setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const moveImage = (i: number, dir: -1 | 1) =>
    setImages((list) => {
      const n = [...list];
      const j = i + dir;
      if (j < 0 || j >= n.length) return list;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <AdminForm action={saveProduct} redirectTo={(data) => `/admin/products/${(data as { id: string }).id}?saved=1`} className="space-y-6">
      {({ pending, errors }) => (
        <>
          {initial.id && <input type="hidden" name="id" value={initial.id} />}
          <input type="hidden" name="images" value={JSON.stringify(images)} />
          <input type="hidden" name="variants" value={JSON.stringify(multi ? variants : [{ ...variants[0], name: variants[0].name || "Default" }])} />

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              {/* Basics */}
              <Card title="Product details">
                <div className="space-y-5">
                  <Input name="name" label="Product name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="e.g. Cinnamon Kiss Moisturizing Body Oil" />
                  <Textarea
                    name="shortDescription"
                    label="Short description"
                    rows={2}
                    value={shortDesc}
                    onChange={(e) => setShortDesc(e.target.value)}
                    hint="One or two sentences shown near the price and in search results."
                    maxLength={400}
                  />
                  <RichText name="description" label="Full description" defaultValue={initial.description} hint="Tell the story of the product. Use the buttons for bold, lists and headings." />
                </div>
              </Card>

              {/* Photos */}
              <Card title="Photos" description="The first photo is the main one. Use the arrows to change the order.">
                <div className="space-y-4">
                  {images.length > 0 && (
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {images.map((im, i) => (
                        <li key={im.url + i} className="group relative overflow-hidden rounded-md border border-line bg-sand">
                          <div className="relative aspect-[4/5]">
                            <Image src={im.url} alt={im.alt || ""} fill sizes="200px" className="object-cover" />
                            {i === 0 && <span className="absolute left-2 top-2 rounded bg-ink px-2 py-0.5 text-[0.65rem] font-medium text-ivory">Main photo</span>}
                            <button type="button" onClick={() => setImages((l) => l.filter((_, j) => j !== i))} className="absolute right-2 top-2 grid size-8 place-items-center rounded-md bg-white/95 shadow" aria-label="Remove photo">
                              <CloseIcon size={14} />
                            </button>
                          </div>
                          <div className="flex items-center gap-1 bg-white p-1.5">
                            <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="rounded px-2 py-1 text-xs hover:bg-sand disabled:opacity-30" aria-label="Move left">←</button>
                            <button type="button" onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} className="rounded px-2 py-1 text-xs hover:bg-sand disabled:opacity-30" aria-label="Move right">→</button>
                            <input
                              value={im.alt}
                              onChange={(e) => setImages((l) => l.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                              placeholder="Describe photo"
                              aria-label="Photo description (for accessibility)"
                              className="min-w-0 flex-1 rounded border border-transparent px-1.5 py-1 text-xs hover:border-line focus:border-ink focus:outline-none"
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <DropZone onUploaded={(url) => setImages((l) => [...l, { url, alt: name }])} />
                  <Button variant="link" className="text-sm" onClick={() => setPicking(true)}>
                    <ImageIcon size={16} /> Choose from photos you&apos;ve already uploaded
                  </Button>
                  <MediaPicker open={picking} onClose={() => setPicking(false)} onPick={(url) => setImages((l) => [...l, { url, alt: name }])} />
                  <Input name="videoUrl" label="Product video (optional)" defaultValue={initial.videoUrl} placeholder="YouTube, Vimeo or .mp4 link" hint="Shown after the photos on the product page." />
                </div>
              </Card>

              {/* Price & stock */}
              <Card
                title="Price & stock"
                description={`Prices are in ${currency}. Customers paying in other currencies see them converted automatically.`}
              >
                {errors.variants && <p className="mb-4 rounded-md bg-danger-soft p-3 text-sm text-danger">{errors.variants}</p>}
                {!multi ? (
                  <div className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-3">
                      <Input label="Price" required prefix={sym} inputMode="decimal" value={variants[0].price} onChange={(e) => setV(0, { price: e.target.value })} placeholder="0.00" />
                      <Input label="Sale price (optional)" prefix={sym} inputMode="decimal" value={variants[0].salePrice} onChange={(e) => setV(0, { salePrice: e.target.value })} hint="Lower than the price to show a sale." />
                      <Input label={<>Cost to you <span className="text-stone">(private)</span></>} prefix={sym} inputMode="decimal" value={variants[0].costPrice} onChange={(e) => setV(0, { costPrice: e.target.value })} hint="Never shown to customers." />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-3">
                      <Input label="How many in stock" type="number" min={0} value={variants[0].stock} onChange={(e) => setV(0, { stock: Number(e.target.value) })} />
                      <Input label="Warn me when stock reaches" type="number" min={0} value={variants[0].lowStockThreshold} onChange={(e) => setV(0, { lowStockThreshold: Number(e.target.value) })} />
                      <Input label="Weight (grams, for shipping)" type="number" min={0} value={variants[0].weightGrams ?? ""} onChange={(e) => setV(0, { weightGrams: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                    <Input label="Stock code / SKU (optional)" value={variants[0].sku} onChange={(e) => setV(0, { sku: e.target.value })} hint="Leave blank and we'll create one." />
                    <div className="rounded-md border border-dashed border-line p-4">
                      <p className="text-sm font-medium">Does this product come in different sizes or scents?</p>
                      <p className="mt-1 text-sm text-stone">For example 237ml and 500ml, each with its own price and stock.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 rounded-md"
                        onClick={() => {
                          setVariants((v) => [{ ...v[0], name: v[0].name === "Default" ? "" : v[0].name }, { ...emptyVariant(), name: "", optionType: v[0].optionType }]);
                          setMulti(true);
                        }}
                      >
                        <PlusIcon size={14} /> Add sizes or scents
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Select
                      label="What do the options differ by?"
                      value={variants[0].optionType}
                      onChange={(e) => setVariants((vs) => vs.map((v) => ({ ...v, optionType: e.target.value })))}
                      options={OPTION_TYPES.map((o) => ({ value: o, label: o }))}
                      className="max-w-xs"
                    />
                    <ul className="space-y-3">
                      {variants.map((v, i) => (
                        <li key={v.id ?? `new-${i}`} className={cn("rounded-md border bg-cream/30 p-4", v.isActive ? "border-line" : "border-dashed border-mist opacity-70")}>
                          <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr_1fr_0.8fr]">
                            <Input label={variants[0].optionType} required value={v.name} onChange={(e) => setV(i, { name: e.target.value })} placeholder="e.g. 237ml" />
                            <Input label="Price" required prefix={sym} inputMode="decimal" value={v.price} onChange={(e) => setV(i, { price: e.target.value })} />
                            <Input label="Sale price" prefix={sym} inputMode="decimal" value={v.salePrice} onChange={(e) => setV(i, { salePrice: e.target.value })} />
                            <Input label="In stock" type="number" min={0} value={v.stock} onChange={(e) => setV(i, { stock: Number(e.target.value) })} />
                          </div>
                          <details className="mt-3">
                            <summary className="flex cursor-pointer items-center gap-1 text-xs text-stone hover:text-ink">More options <ChevronDown size={14} /></summary>
                            <div className="mt-3 grid gap-3 sm:grid-cols-4">
                              <Input label="Cost (private)" prefix={sym} inputMode="decimal" value={v.costPrice} onChange={(e) => setV(i, { costPrice: e.target.value })} />
                              <Input label="Stock alert at" type="number" min={0} value={v.lowStockThreshold} onChange={(e) => setV(i, { lowStockThreshold: Number(e.target.value) })} />
                              <Input label="Weight (g)" type="number" min={0} value={v.weightGrams ?? ""} onChange={(e) => setV(i, { weightGrams: e.target.value ? Number(e.target.value) : null })} />
                              <Input label="SKU" value={v.sku} onChange={(e) => setV(i, { sku: e.target.value })} placeholder="Auto" />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-4">
                              <label className="text-xs text-stone">
                                Photo for this option:{" "}
                                <select value={v.imageUrl ?? ""} onChange={(e) => setV(i, { imageUrl: e.target.value || null })} className="ml-1 rounded border border-line bg-white px-2 py-1 text-xs">
                                  <option value="">Main photo</option>
                                  {images.map((im, j) => <option key={im.url} value={im.url}>Photo {j + 1}</option>)}
                                </select>
                              </label>
                              <Checkbox label="Available to buy" checked={v.isActive} onChange={(e) => setV(i, { isActive: e.target.checked })} />
                            </div>
                          </details>
                          {variants.length > 1 && (
                            <button type="button" onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))} className="mt-3 inline-flex items-center gap-1 text-xs text-danger hover:underline">
                              <TrashIcon size={13} /> Remove this option
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                    <Button variant="outline" size="sm" className="rounded-md" onClick={() => setVariants((vs) => [...vs, { ...emptyVariant(), name: "", optionType: vs[0].optionType }])}>
                      <PlusIcon size={14} /> Add another option
                    </Button>
                  </div>
                )}
              </Card>

              {/* Details */}
              <Card title="Ingredients & how to use" description="Only list what is on your label. Leave blank to hide a section.">
                <div className="space-y-5">
                  <Textarea name="ingredients" label="Ingredients" rows={3} defaultValue={initial.ingredients} />
                  <Textarea name="benefits" label="Benefits" rows={3} defaultValue={initial.benefits} hint="One per line. Avoid medical claims (e.g. “cures”, “treats”)." />
                  <Textarea name="howToUse" label="How to use" rows={3} defaultValue={initial.howToUse} />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input name="size" label="Size shown on page" defaultValue={initial.size} placeholder="e.g. 237ml / 8 oz" />
                    <Input name="dimensions" label="Package dimensions (optional)" defaultValue={initial.dimensions} placeholder="e.g. 6 × 6 × 18 cm" />
                  </div>
                </div>
              </Card>

              {/* SEO */}
              <Card title={<span className="flex items-center gap-2">Search engines (Google) <Help>How this product appears in Google results. If you leave these blank we use the product name and short description.</Help></span>}>
                <div className="space-y-5">
                  <div className="rounded-md border border-line bg-cream/40 p-4 text-sm">
                    <p className="text-xs text-stone">Preview</p>
                    <p className="mt-1 truncate text-[#1a0dab]">{seoTitle || `${name || "Product name"} | Rivkah Luxe`}</p>
                    <p className="truncate text-xs text-[#006621]">{siteUrl}/products/{initial.slug || "…"}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-charcoal">{seoDesc || shortDesc || "Your short description will appear here."}</p>
                  </div>
                  <Input name="seoTitle" label="Page title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={120} hint={`${seoTitle.length}/60 characters recommended`} />
                  <Textarea name="seoDescription" label="Description" rows={2} value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} maxLength={320} hint={`${seoDesc.length}/155 characters recommended`} />
                  <Input name="slug" label="Web address" defaultValue={initial.slug} prefix="/products/" inputClassName="pl-24" hint="Leave as is unless you need to change it. Changing it breaks old links." />
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card title="Visibility">
                <fieldset className="space-y-3">
                  <legend className="sr-only">Status</legend>
                  {(["PUBLISHED", "DRAFT", "OUT_OF_STOCK", "ARCHIVED"] as const).map((s) => (
                    <label key={s} className={cn("flex cursor-pointer gap-3 rounded-md border p-3 text-sm", status === s ? "border-ink bg-cream/50" : "border-line")}>
                      <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="mt-0.5 accent-ink" />
                      <span>
                        <span className="font-medium">{s === "PUBLISHED" ? "Live in shop" : s === "DRAFT" ? "Draft" : s === "OUT_OF_STOCK" ? "Out of stock" : "Archived"}</span>
                        <span className="block text-xs text-stone">{STATUS_HELP[s]}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <div className="mt-4 border-t border-line pt-4">
                  <Checkbox name="isFeatured" defaultChecked={initial.isFeatured} label="Feature on homepage" description="Shows in “The Signatures” section." />
                </div>
              </Card>
              <Card title="Organise">
                <div className="space-y-5">
                  <Select name="categoryId" label="Category" defaultValue={initial.categoryId}>
                    <option value="">No category</option>
                    {topCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                  {subCats.length > 0 && (
                    <Select name="subcategoryId" label="Subcategory (optional)" defaultValue={initial.subcategoryId}>
                      <option value="">None</option>
                      {subCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  )}
                  {collections.length > 0 && (
                    <fieldset>
                      <legend className="mb-2 text-[0.78rem] font-medium text-charcoal">Collections</legend>
                      <div className="space-y-2">
                        {collections.map((c) => (
                          <Checkbox key={c.id} name="collections" value={c.id} defaultChecked={initial.collections.includes(c.id)} label={c.name} />
                        ))}
                      </div>
                    </fieldset>
                  )}
                  <Input name="tags" label="Search words (tags)" defaultValue={initial.tags} hint="Separate with commas: vanilla, gift, body oil" />
                  <Input name="sku" label="Product code (optional)" defaultValue={initial.sku} hint="Leave blank to create one automatically." />
                </div>
              </Card>
            </div>
          </div>
          <SubmitBar pending={pending} label={initial.id ? "Save product" : "Add product"} cancelHref="/admin/products" />
        </>
      )}
    </AdminForm>
  );
}
