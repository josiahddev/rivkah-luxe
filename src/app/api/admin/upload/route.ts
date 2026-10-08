import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/auth/session";
import { storeImage } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";

// Upload one image. Only signed-in admins with photo/product/content access.
// Same-origin requests only (checked below) so other sites can't post here.
export async function POST(req: Request) {
  const user = (await assertAdmin("media")) ?? (await assertAdmin("products")) ?? (await assertAdmin("content"));
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  if (!(await rateLimit("upload", 120, 600, user.id))) return NextResponse.json({ error: "Too many uploads — please wait a minute." }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  try {
    const stored = await storeImage(file);
    const asset = await db.mediaAsset.create({
      data: {
        url: stored.url, storageKey: stored.key, filename: file.name.slice(0, 200), mimeType: stored.mimeType,
        size: stored.size, width: stored.width, height: stored.height, alt: String(form?.get("alt") ?? "").slice(0, 200) || null, uploadedById: user.id,
      },
    });
    return NextResponse.json({ id: asset.id, url: asset.url, width: asset.width, height: asset.height });
  } catch (err) {
    console.error("[upload]", err);
    const message = err instanceof Error && /upload|image|large|storage/i.test(err.message) ? err.message : "That image couldn't be uploaded. Please try another file.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
