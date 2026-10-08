import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { ADMIN_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/utils";
import { Card, PageHeader } from "@/components/admin/ui";
import { InviteForm, RoleSelect } from "@/components/admin/settings-forms";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireAdmin("team");
  const team = await db.user.findMany({ where: { role: { in: ADMIN_ROLES } }, orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageHeader title="Team" description="People who can open this dashboard, and what they're allowed to do." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="Team members">
            <ul className="-my-3 divide-y divide-line">
              {team.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-stone">{u.email} · {ROLE_LABELS[u.role]} · last sign-in {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "never"}</p>
                  </div>
                  <RoleSelect userId={u.id} role={u.role} isSelf={u.id === me.id} />
                </li>
              ))}
            </ul>
          </Card>
          <Card title="What each role can do">
            <dl className="space-y-3 text-sm">
              {(Object.keys(ROLE_DESCRIPTIONS) as (keyof typeof ROLE_DESCRIPTIONS)[]).map((r) => (
                <div key={r}><dt className="font-medium">{ROLE_LABELS[r]}</dt><dd className="text-stone">{ROLE_DESCRIPTIONS[r]}</dd></div>
              ))}
            </dl>
          </Card>
        </div>
        <Card title="Add a team member"><InviteForm /></Card>
      </div>
    </>
  );
}
