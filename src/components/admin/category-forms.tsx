"use client";

import { deleteCategory, deleteCollection, saveCategory, saveCollection } from "@/server/admin/products";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { AdminForm, ConfirmAction } from "./client-ui";
import { ImageField } from "./image-uploader";

type Cat = { id: string; name: string; slug: string; description: string | null; imageUrl: string | null; parentId: string | null; sortOrder: number; isActive: boolean; showOnHomepage: boolean; seoTitle: string | null; seoDescription: string | null };

export function CategoryForm({ category: c, parents }: { category: Cat | null; parents: { id: string; name: string }[] }) {
  return (
    <AdminForm action={saveCategory} redirectTo="/admin/categories">
      {({ pending, errors }) => (
        <div className="space-y-4">
          {c && <input type="hidden" name="id" value={c.id} />}
          <Input name="name" label="Name" required defaultValue={c?.name} error={errors.name} placeholder="e.g. Body Oils" />
          <Textarea name="description" label="Short description" rows={2} defaultValue={c?.description ?? ""} />
          <ImageField name="imageUrl" label="Photo" defaultValue={c?.imageUrl} aspect="aspect-[3/4]" help="Shown on the homepage category tiles." />
          <Select name="parentId" label="Put inside another category (optional)" defaultValue={c?.parentId ?? ""}>
            <option value="">No — this is a main category</option>
            {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Input name="sortOrder" type="number" label="Order" defaultValue={c?.sortOrder ?? 0} hint="Lower numbers show first." />
          <Checkbox name="isActive" defaultChecked={c?.isActive ?? true} label="Visible in the shop" />
          <Checkbox name="showOnHomepage" defaultChecked={c?.showOnHomepage ?? true} label="Show on the homepage" />
          <details className="text-sm">
            <summary className="cursor-pointer text-stone">Search engine settings</summary>
            <div className="mt-3 space-y-3">
              <Input name="slug" label="Web address" defaultValue={c?.slug} prefix="/category/" inputClassName="pl-24" />
              <Input name="seoTitle" label="Page title" defaultValue={c?.seoTitle ?? ""} />
              <Textarea name="seoDescription" label="Description" rows={2} defaultValue={c?.seoDescription ?? ""} />
            </div>
          </details>
          <div className="flex gap-2">
            <Button type="submit" className="rounded-md" loading={pending}>{c ? "Save category" : "Add category"}</Button>
            {c && <a href="/admin/categories" className="px-3 py-3 text-sm text-stone">Cancel</a>}
          </div>
        </div>
      )}
    </AdminForm>
  );
}

export function DeleteCategory({ id, name, count }: { id: string; name: string; count: number }) {
  return (
    <ConfirmAction
      action={() => deleteCategory(id)}
      label="Delete"
      variant="ghost"
      className="rounded-md text-danger"
      title={`Delete “${name}”?`}
      message={count ? `Its ${count} products will be kept but won't have a category.` : "This category is empty."}
      confirmLabel="Delete category"
    />
  );
}

type Col = { id: string; name: string; slug: string; description: string | null; imageUrl: string | null; isActive: boolean; sortOrder: number };

export function CollectionForm({ collection: c }: { collection: Col | null }) {
  return (
    <AdminForm action={saveCollection} redirectTo="/admin/categories">
      {({ pending, errors }) => (
        <div className="space-y-4">
          {c && <input type="hidden" name="id" value={c.id} />}
          <Input name="name" label="Name" required defaultValue={c?.name} error={errors.name} placeholder="e.g. Christmas Gifts" />
          <Textarea name="description" label="Description" rows={2} defaultValue={c?.description ?? ""} />
          <ImageField name="imageUrl" label="Banner photo" defaultValue={c?.imageUrl} />
          <Input name="sortOrder" type="number" label="Order" defaultValue={c?.sortOrder ?? 0} />
          <Checkbox name="isActive" defaultChecked={c?.isActive ?? true} label="Visible in the shop menu" />
          <div className="flex gap-2">
            <Button type="submit" className="rounded-md" loading={pending}>{c ? "Save collection" : "Add collection"}</Button>
            {c && <a href="/admin/categories" className="px-3 py-3 text-sm text-stone">Cancel</a>}
          </div>
        </div>
      )}
    </AdminForm>
  );
}

export function DeleteCollection({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmAction action={() => deleteCollection(id)} label="Delete" variant="ghost" className="rounded-md text-danger" title={`Delete “${name}”?`} message="The products in it are not deleted." confirmLabel="Delete collection" />
  );
}
