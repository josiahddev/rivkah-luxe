import "server-only";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { put, del } from "@vercel/blob";
import { randomToken } from "@/lib/auth/tokens";
import { slugify } from "@/lib/utils";

// Image storage.
//   • Production: Vercel Blob (set BLOB_READ_WRITE_TOKEN). Files are public, CDN-served.
//   • Local development without a token: saved to /public/uploads.

export function storageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) || process.env.NODE_ENV !== "production";
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type StoredImage = { url: string; key: string; width: number; height: number; size: number; mimeType: string };

/** Optimise an uploaded image (max 2000px, WebP) and store it. */
export async function storeImage(file: File): Promise<StoredImage> {
  if (!ALLOWED.includes(file.type)) throw new Error("Please upload a JPG, PNG, WebP or GIF image.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("That image is too large (max 10 MB).");
  const input = Buffer.from(await file.arrayBuffer());
  const image = sharp(input, { failOn: "error" }).rotate(); // respect phone orientation, strip EXIF
  const out = await image.resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const base = slugify(file.name.replace(/\.[a-z0-9]+$/i, "")) || "image";
  const name = `${base}-${randomToken(5).toLowerCase().replace(/[^a-z0-9]/g, "")}.webp`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`media/${name}`, out.data, { access: "public", contentType: "image/webp", addRandomSuffix: false });
    return { url: blob.url, key: blob.pathname, width: out.info.width, height: out.info.height, size: out.info.size, mimeType: "image/webp" };
  }
  if (process.env.NODE_ENV === "production") throw new Error("Image storage isn't set up yet (BLOB_READ_WRITE_TOKEN is missing).");
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), out.data);
  return { url: `/uploads/${name}`, key: `uploads/${name}`, width: out.info.width, height: out.info.height, size: out.info.size, mimeType: "image/webp" };
}

export async function deleteStoredFile(url: string) {
  try {
    if (url.startsWith("https://") && process.env.BLOB_READ_WRITE_TOKEN) await del(url);
    else if (url.startsWith("/uploads/")) await unlink(path.join(process.cwd(), "public", url));
  } catch (err) {
    console.error("[storage] delete failed", err);
  }
}
