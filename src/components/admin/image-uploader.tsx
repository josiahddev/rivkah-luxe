"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CloseIcon, ImageIcon, UploadIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/dialog";
import { Button, Spinner } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Shrink very large photos in the browser before upload (keeps uploads fast on phones and under hosting limits). */
async function downscale(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 3.5 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export async function uploadImage(file: File): Promise<{ url: string } | { error: string }> {
  const small = await downscale(file);
  const fd = new FormData();
  fd.append("file", small);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const json = await res.json().catch(() => ({ error: "Upload failed. Please try again." }));
  return res.ok ? { url: json.url } : { error: json.error ?? "Upload failed." };
}

/** Drop zone that uploads files one by one and reports each URL. */
export function DropZone({ onUploaded, multiple = true, label = "Drag photos here, or click to choose", compact }: { onUploaded: (url: string) => void; multiple?: boolean; label?: string; compact?: boolean }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handle = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!list.length) {
        toast("Please choose image files (JPG, PNG or WebP).", "error");
        return;
      }
      setBusy(list.length);
      for (const f of list) {
        const r = await uploadImage(f);
        if ("url" in r) onUploaded(r.url);
        else toast(`${f.name}: ${r.error}`, "error");
        setBusy((n) => n - 1);
      }
    },
    [onUploaded, toast],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files);
      }}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      role="button"
      tabIndex={0}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center transition-colors",
        compact ? "gap-1 p-4" : "gap-2 p-8",
        over ? "border-gold bg-champagne/15" : "border-line bg-cream/40 hover:border-mist",
      )}
    >
      <input ref={input} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={(e) => e.target.files && handle(e.target.files)} />
      {busy > 0 ? (
        <>
          <Spinner className="size-6 text-gold-deep" />
          <p className="text-sm">Uploading {busy} photo{busy > 1 ? "s" : ""}…</p>
        </>
      ) : (
        <>
          <UploadIcon size={compact ? 20 : 28} className="text-gold-deep" />
          <p className="text-sm font-medium">{label}</p>
          {!compact && <p className="text-xs text-stone">JPG, PNG or WebP up to 10 MB. We resize and optimise them for you.</p>}
        </>
      )}
    </div>
  );
}

/** Pick an existing photo from the media library. */
export function MediaPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (url: string) => void }) {
  const [items, setItems] = useState<{ id: string; url: string; filename: string }[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!open) return;
    fetch(`/api/admin/media?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .catch(() => setItems([]));
  }, [open, q]);
  return (
    <Modal open={open} onClose={onClose} title="Choose a photo" className="sm:max-w-3xl">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search photos by name…" className="mb-4 h-11 w-full rounded-md border border-line px-3 text-sm focus:border-ink focus:outline-none" />
      <div className="mb-4">
        <DropZone compact multiple={false} label="Upload a new photo" onUploaded={(url) => { onPick(url); onClose(); }} />
      </div>
      {items === null ? (
        <p className="text-sm text-stone">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-stone">No photos found.</p>
      ) : (
        <div className="grid max-h-[50vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
          {items.map((m) => (
            <button key={m.id} type="button" onClick={() => { onPick(m.url); onClose(); }} className="group relative aspect-square overflow-hidden rounded-md bg-sand ring-gold hover:ring-2" title={m.filename}>
              <Image src={m.url} alt={m.filename} fill sizes="160px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

/** A single-image field (hero photo, category photo, logo…). Stores the URL in a hidden input. */
export function ImageField({ name, label, defaultValue, help, aspect = "aspect-[4/3]" }: { name: string; label: string; defaultValue?: string | null; help?: string; aspect?: string }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [picking, setPicking] = useState(false);
  return (
    <div className="space-y-2">
      <p className="text-[0.78rem] font-medium text-charcoal">{label}</p>
      <input type="hidden" name={name} value={url} />
      {url ? (
        <div className={cn("relative w-full max-w-sm overflow-hidden rounded-md border border-line bg-sand", aspect)}>
          <Image src={url} alt="" fill sizes="384px" className="object-cover" />
          <div className="absolute right-2 top-2 flex gap-2">
            <button type="button" onClick={() => setPicking(true)} className="rounded-md bg-white/95 px-3 py-1.5 text-xs font-medium shadow hover:bg-white">Change</button>
            <button type="button" onClick={() => setUrl("")} className="grid size-8 place-items-center rounded-md bg-white/95 shadow hover:bg-white" aria-label="Remove photo"><CloseIcon size={14} /></button>
          </div>
        </div>
      ) : (
        <div className="max-w-sm space-y-2">
          <DropZone compact multiple={false} onUploaded={setUrl} label="Drag a photo here, or click" />
          <Button variant="link" className="text-xs" onClick={() => setPicking(true)}>
            <ImageIcon size={14} /> Choose from your photos
          </Button>
        </div>
      )}
      {help && <p className="text-xs text-stone">{help}</p>}
      <MediaPicker open={picking} onClose={() => setPicking(false)} onPick={setUrl} />
    </div>
  );
}
