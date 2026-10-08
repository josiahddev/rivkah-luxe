import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Pages" };

export default async function PagesList() {
  await requireAdmin("content");
  const pages = await db.page.findMany({ orderBy: { title: "asc" } });
  return (
    <>
      <PageHeader
        title="Pages"
        description="Your About, policy and information pages."
        back={{ href: "/admin/content", label: "Website content" }}
        actions={<Link href="/admin/content/pages/new" className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-ivory">+ New page</Link>}
      />
      <ul className="divide-y divide-line rounded-lg border border-line bg-white">
        {pages.map((p) => (
          <li key={p.slug} className="flex flex-wrap items-center gap-3 px-5 py-4">
            <div className="flex-1">
              <Link href={`/admin/content/pages/${p.slug}`} className="font-medium hover:underline">{p.title}</Link>
              <p className="text-xs text-stone">/{p.slug} · updated {formatDate(p.updatedAt)}</p>
            </div>
            <a href={`/${p.slug}`} target="_blank" className="text-sm text-stone underline">View</a>
            <Link href={`/admin/content/pages/${p.slug}`} className="rounded-md border border-line px-3 py-1.5 text-sm hover:border-ink">Edit</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
