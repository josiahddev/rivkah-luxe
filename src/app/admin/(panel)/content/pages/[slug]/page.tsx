import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/ui";
import { PageEditor } from "@/components/admin/content-forms";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params }: PageProps<"/admin/content/pages/[slug]">) {
  await requireAdmin("content");
  const { slug } = await params;
  const isNew = slug === "new";
  const p = isNew ? null : await db.page.findUnique({ where: { slug } });
  if (!isNew && !p) notFound();
  return (
    <>
      <PageHeader title={isNew ? "New page" : p!.title} back={{ href: "/admin/content/pages", label: "Pages" }} actions={p ? <a href={`/${p.slug}`} target="_blank" className="rounded-md border border-line bg-white px-4 py-2.5 text-sm">View page ↗</a> : undefined} />
      <PageEditor isNew={isNew} page={{ slug: p?.slug ?? "", title: p?.title ?? "", body: p?.body ?? "", seoTitle: p?.seoTitle ?? "", seoDescription: p?.seoDescription ?? "" }} />
    </>
  );
}
