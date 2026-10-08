import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { Card, PageHeader, Pill } from "@/components/admin/ui";
import { DeleteFaq, FaqEditor } from "@/components/admin/content-forms";

export const metadata = { title: "FAQ" };

export default async function FaqAdmin({ searchParams }: PageProps<"/admin/content/faq">) {
  await requireAdmin("content");
  const edit = (await searchParams).edit;
  const items = await db.faqItem.findMany({ orderBy: [{ group: "asc" }, { sortOrder: "asc" }] });
  const editing = items.find((i) => i.id === edit) ?? null;
  return (
    <>
      <PageHeader title="FAQ" description="Questions shown on your FAQ page, grouped by topic." back={{ href: "/admin/content", label: "Website content" }} actions={<a href="/faq" target="_blank" className="rounded-md border border-line bg-white px-4 py-2.5 text-sm">View FAQ ↗</a>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card title={`${items.length} questions`}>
          <ul className="-my-3 divide-y divide-line">
            {items.map((i) => (
              <li key={i.id} className="flex flex-wrap items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{i.question} {!i.isActive && <Pill>Hidden</Pill>}</p>
                  <p className="line-clamp-2 text-sm text-stone">{i.answer}</p>
                  <p className="text-xs text-gold-deep">{i.group}</p>
                </div>
                <a href={`?edit=${i.id}`} className="rounded-md border border-line px-3 py-1.5 text-xs hover:border-ink">Edit</a>
                <DeleteFaq id={i.id} />
              </li>
            ))}
          </ul>
        </Card>
        <Card title={editing ? "Edit question" : "Add a question"}>
          <FaqEditor key={editing?.id ?? "new"} faq={editing} />
        </Card>
      </div>
    </>
  );
}
