"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteMedia, updateMediaAlt } from "@/server/admin/site";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CopyIcon } from "@/components/ui/icons";
import { ConfirmAction } from "./client-ui";
import { DropZone } from "./image-uploader";
import { AdminEmpty } from "./ui";

export function MediaUpload() {
  const router = useRouter();
  return (
    <div className="mb-6">
      <DropZone onUploaded={() => router.refresh()} />
    </div>
  );
}

type Item = { id: string; url: string; filename: string; alt: string; size: number; width: number | null; height: number | null; usedIn: { label: string; href: string }[] };

export function MediaGrid({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<Item | null>(null);
  const [alt, setAlt] = useState("");
  const { toast } = useToast();
  if (!items.length) return <AdminEmpty title="No photos yet." message="Drag photos into the box above to upload them." />;
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((m) => (
          <li key={m.id}>
            <button onClick={() => { setOpen(m); setAlt(m.alt); }} className="group block w-full text-left">
              <span className="relative block aspect-square overflow-hidden rounded-md bg-sand ring-gold group-hover:ring-2">
                <Image src={m.url} alt={m.alt || m.filename} fill sizes="180px" className="object-cover" />
              </span>
              <span className="mt-1.5 block truncate text-xs">{m.filename}</span>
              <span className="block text-[0.7rem] text-stone">{m.usedIn.length ? `Used in ${m.usedIn.length} place${m.usedIn.length > 1 ? "s" : ""}` : "Not used"}</span>
            </button>
          </li>
        ))}
      </ul>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.filename ?? "Photo"} className="sm:max-w-2xl">
        {open && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="relative aspect-square overflow-hidden rounded-md bg-sand"><Image src={open.url} alt={open.alt} fill sizes="320px" className="object-contain" /></div>
            <div className="space-y-4 text-sm">
              <p className="text-stone">{open.width && open.height ? `${open.width} × ${open.height}px · ` : ""}{Math.round(open.size / 1024)} KB</p>
              <label className="block space-y-1">
                <span className="text-xs font-medium">Description (helps blind visitors and Google)</span>
                <input value={alt} onChange={(e) => setAlt(e.target.value)} className="h-10 w-full rounded-md border border-line px-3 focus:border-ink focus:outline-none" />
              </label>
              <Button size="sm" variant="outline" className="rounded-md" onClick={async () => { await updateMediaAlt(open.id, alt); toast("Description saved."); }}>Save description</Button>
              <div>
                <p className="text-xs font-medium">Used in</p>
                {open.usedIn.length ? (
                  <ul className="mt-1 space-y-1">{open.usedIn.map((u) => <li key={u.label}><Link href={u.href} className="underline">{u.label}</Link></li>)}</ul>
                ) : <p className="text-stone">Not used anywhere yet.</p>}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(open.url.startsWith("http") ? open.url : location.origin + open.url); toast("Link copied."); }} className="inline-flex items-center gap-1.5 text-xs underline"><CopyIcon size={14} /> Copy link</button>
              <div className="border-t border-line pt-4">
                <ConfirmAction
                  action={async () => { const r = await deleteMedia(open.id); if (r.ok) setOpen(null); return r; }}
                  label="Delete photo"
                  className="rounded-md"
                  title="Delete this photo?"
                  message={open.usedIn.length ? "It's still being used — remove it from those places first." : "It will be permanently deleted."}
                  confirmLabel="Delete"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
