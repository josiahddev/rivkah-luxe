import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/auth/session";

// Media library listing for the photo picker.
export async function GET(req: Request) {
  const user = (await assertAdmin("media")) ?? (await assertAdmin("products")) ?? (await assertAdmin("content"));
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  const items = await db.mediaAsset.findMany({
    where: q ? { OR: [{ filename: { contains: q, mode: "insensitive" } }, { alt: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, url: true, filename: true },
  });
  return NextResponse.json({ items });
}
