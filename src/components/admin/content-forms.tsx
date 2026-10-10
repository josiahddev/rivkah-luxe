"use client";

import Link from "next/link";

import Image from "next/image";
import { useState } from "react";
import { deleteFaq, deletePage, saveAnnouncement, saveFaq, savePage, saveSection } from "@/server/admin/site";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { CloseIcon } from "@/components/ui/icons";
import { AdminForm, ConfirmAction, SubmitBar } from "./client-ui";
import { DropZone, ImageField } from "./image-uploader";
import { RichText } from "./rich-text";
import { Card } from "./ui";

type Field =
  | { name: string; label: string; type?: "text" | "textarea" | "number"; value: string; hint?: string }
  | { name: string; label: string; type: "select"; value: string; options: { value: string; label: string }[]; hint?: string }
  | { name: string; label: string; type: "image"; value: string; hint?: string }
  | { name: string; label: string; type: "images"; values: string[]; hint?: string };

function ImagesField({ name, values }: { name: string; values: string[] }) {
  const [list, setList] = useState(values);
  return (
    <div className="space-y-3">
      {list.map((u) => <input key={u} type="hidden" name={name} value={u} />)}
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {list.map((u, i) => (
          <li key={u + i} className="relative aspect-square overflow-hidden rounded bg-sand">
            <Image src={u} alt="" fill sizes="120px" className="object-cover" />
            <button type="button" onClick={() => setList((l) => l.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid size-6 place-items-center rounded bg-white/95" aria-label="Remove"><CloseIcon size={12} /></button>
          </li>
        ))}
      </ul>
      {list.length < 6 && <DropZone compact onUploaded={(u) => setList((l) => [...l, u].slice(0, 6))} label="Add photos" />}
    </div>
  );
}

export function SectionForm({ sectionKey, title, description, visible, fields }: { sectionKey: string; title: string; description?: string; visible: boolean; fields: Field[] }) {
  return (
    <AdminForm action={saveSection}>
      {({ pending }) => (
        <Card title={title} description={description} actions={<Checkbox name="isVisible" defaultChecked={visible} label="Show this section" />}>
          <input type="hidden" name="key" value={sectionKey} />
          <div className="grid gap-5 sm:grid-cols-2">
            {fields.map((f) => {
              if (f.type === "image") return <div key={f.name} className="sm:col-span-2"><ImageField name={f.name} label={f.label} defaultValue={f.value} help={f.hint} /></div>;
              if (f.type === "images") return <div key={f.name} className="sm:col-span-2"><p className="mb-2 text-[0.78rem] font-medium text-charcoal">{f.label}</p><ImagesField name={f.name} values={f.values} /></div>;
              if (f.type === "select") return <Select key={f.name} name={f.name} label={f.label} defaultValue={f.value} options={f.options} hint={f.hint} />;
              if (f.type === "textarea") return <Textarea key={f.name} name={f.name} label={f.label} defaultValue={f.value} rows={3} hint={f.hint} className="sm:col-span-2" />;
              return <Input key={f.name} name={f.name} label={f.label} type={f.type === "number" ? "number" : "text"} min={f.type === "number" ? 1 : undefined} max={f.type === "number" ? 12 : undefined} defaultValue={f.value} hint={f.hint} />;
            })}
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="submit" className="rounded-md" loading={pending} loadingText="Saving…">Save section</Button>
          </div>
        </Card>
      )}
    </AdminForm>
  );
}

export function AnnouncementForm({ enabled, messages, link }: { enabled: boolean; messages: string[]; link: string }) {
  return (
    <AdminForm action={saveAnnouncement}>
      {({ pending }) => (
        <Card title="Announcement bar" description="The thin black strip at the very top of every page. Messages rotate every few seconds." actions={<Checkbox name="enabled" defaultChecked={enabled} label="Show the bar" />}>
          <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
            <Textarea name="messages" label="Messages (one per line, up to 5)" rows={3} defaultValue={messages.join("\n")} placeholder="Free shipping across Canada on orders over $85" />
            <Input name="link" label="Link when clicked (optional)" defaultValue={link} placeholder="/shop" />
          </div>
          <div className="mt-5 flex justify-end"><Button type="submit" className="rounded-md" loading={pending}>Save announcement</Button></div>
        </Card>
      )}
    </AdminForm>
  );
}

export function PageEditor({ page, isNew }: { page: { slug: string; title: string; body: string; seoTitle: string; seoDescription: string }; isNew: boolean }) {
  const core = ["about", "shipping-delivery", "returns-refunds", "privacy-policy", "terms-and-conditions", "cookie-policy"];
  return (
    <AdminForm action={savePage} redirectTo={(d) => `/admin/content/pages/${(d as { slug: string }).slug}`} className="space-y-6">
      {({ pending, errors }) => (
        <>
          {!isNew && <input type="hidden" name="originalSlug" value={page.slug} />}
          <Card>
            <div className="space-y-5">
              <Input name="title" label="Page title" required defaultValue={page.title} error={errors.title} />
              {isNew && <Input name="slug" label="Web address" prefix="/" inputClassName="pl-7" placeholder="our-ingredients" error={errors.slug} hint="Leave blank to make one from the title." />}
              <RichText name="body" label="Page text" defaultValue={page.body} minHeight={360} />
              <p className="text-xs text-stone">Tip: don&apos;t make medical claims or claim certifications you don&apos;t have. For legal pages, ask a professional to review the wording.</p>
            </div>
          </Card>
          <Card title="Search engines (optional)">
            <div className="space-y-4">
              <Input name="seoTitle" label="Page title for Google" defaultValue={page.seoTitle} />
              <Textarea name="seoDescription" label="Description for Google" rows={2} defaultValue={page.seoDescription} />
            </div>
          </Card>
          <SubmitBar
            pending={pending}
            label="Save page"
            cancelHref="/admin/content/pages"
            extra={!isNew && !core.includes(page.slug) ? <ConfirmAction action={() => deletePage(page.slug)} label="Delete page" variant="ghost" className="mr-auto rounded-md text-danger" title="Delete this page?" message="Links to it will stop working." confirmLabel="Delete" redirectTo="/admin/content/pages" /> : undefined}
          />
        </>
      )}
    </AdminForm>
  );
}

type Faq = { id: string; question: string; answer: string; group: string; sortOrder: number; isActive: boolean };

export function FaqEditor({ faq }: { faq: Faq | null }) {
  return (
    <AdminForm action={saveFaq} redirectTo="/admin/content/faq" resetOnSuccess={!faq}>
      {({ pending }) => (
        <div className="space-y-4">
          {faq && <input type="hidden" name="id" value={faq.id} />}
          <Input name="question" label="Question" required defaultValue={faq?.question} />
          <Textarea name="answer" label="Answer" required rows={4} defaultValue={faq?.answer} />
          <div className="grid grid-cols-2 gap-4">
            <Input name="group" label="Group" defaultValue={faq?.group ?? "General"} hint="e.g. Shipping, Payments" />
            <Input name="sortOrder" type="number" label="Order" defaultValue={faq?.sortOrder ?? 0} />
          </div>
          <Select name="isActive" label="Visible" defaultValue={faq?.isActive === false ? "off" : "on"} options={[{ value: "on", label: "Shown on FAQ page" }, { value: "off", label: "Hidden" }]} />
          <div className="flex gap-2">
            <Button type="submit" className="rounded-md" loading={pending}>{faq ? "Save question" : "Add question"}</Button>
            {faq && <Link href="/admin/content/faq" className="px-3 py-3 text-sm text-stone">Cancel</Link>}
          </div>
        </div>
      )}
    </AdminForm>
  );
}

export function DeleteFaq({ id }: { id: string }) {
  return <ConfirmAction action={() => deleteFaq(id)} label="Delete" variant="ghost" className="rounded-md text-danger" title="Delete this question?" message="It will be removed from the FAQ page." confirmLabel="Delete" />;
}
