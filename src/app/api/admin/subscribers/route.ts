import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/auth/session";

// CSV export of subscribed emails (signed-in admins only).
export async function GET() {
  const user = await assertAdmin("subscribers");
  if (!user) return new Response("Unauthorised", { status: 401 });
  const subs = await db.newsletterSubscriber.findMany({ where: { status: "SUBSCRIBED" }, orderBy: { createdAt: "asc" } });
  // Prefix cells that start with formula characters so spreadsheets don't execute them.
  const cell = (v: string) => `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
  const rows = [["email", "joined", "source"], ...subs.map((s) => [s.email, s.createdAt.toISOString(), s.source ?? ""])];
  const csv = rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
