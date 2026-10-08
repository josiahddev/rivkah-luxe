"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteProduct, duplicateProduct } from "@/server/admin/products";
import { useToast } from "@/components/ui/toast";
import { ConfirmAction } from "./client-ui";

export function ProductActions({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await duplicateProduct(id);
            if (r.ok && r.data) {
              toast(r.message ?? "Copied.");
              router.push(`/admin/products/${r.data.id}`);
            } else if (!r.ok) toast(r.error, "error");
          })
        }
        className="rounded-md border border-line bg-white px-4 py-2.5 text-sm hover:border-ink disabled:opacity-50"
      >
        {pending ? "Copying…" : "Duplicate"}
      </button>
      <ConfirmAction
        action={() => deleteProduct(id)}
        label="Delete"
        title={`Delete ${name}?`}
        message="This can't be undone. Past orders will still show it. To hide it without deleting, set it to Archived instead."
        confirmLabel="Delete product"
        redirectTo="/admin/products"
        className="rounded-md"
      />
    </>
  );
}
