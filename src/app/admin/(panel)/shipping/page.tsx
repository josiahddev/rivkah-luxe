import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { countryName, countryOptions } from "@/lib/regions";
import { Card, PageHeader, Pill } from "@/components/admin/ui";
import { DeleteZone, ZoneForm } from "@/components/admin/settings-forms";

export const metadata = { title: "Shipping" };

export default async function ShippingPage({ searchParams }: PageProps<"/admin/shipping">) {
  await requireAdmin("shipping");
  const edit = (await searchParams).edit;
  const [zones, settings] = await Promise.all([db.shippingZone.findMany({ orderBy: { sortOrder: "asc" } }), getSettings()]);
  const editing = zones.find((z) => z.id === edit) ?? null;
  const c = settings.currency;
  return (
    <>
      <PageHeader title="Shipping" description={`Set a shipping fee for each part of the world, in ${c}. At checkout, the customer's address picks the zone automatically. A zone limited to certain provinces/states wins over a whole-country zone.`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <Card title="Shipping zones">
          {zones.length === 0 ? <p className="text-sm text-stone">No zones yet — customers can't check out until you add one.</p> : (
            <ul className="-my-3 divide-y divide-line">
              {zones.map((z) => (
                <li key={z.id} className="flex flex-wrap items-start gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{z.name} {!z.isActive && <Pill>Off</Pill>} {z.isFallback && <Pill tone="blue">Everywhere else</Pill>}</p>
                    <p className="text-sm">
                      {z.fee ? formatMoney(z.fee, c) : "Free"}
                      {z.freeOverAmount ? <span className="text-gold-deep"> · free over {formatMoney(z.freeOverAmount, c)}</span> : null}
                      {z.estimatedDelivery && <span className="text-stone"> · {z.estimatedDelivery}</span>}
                    </p>
                    {!z.isFallback && <p className="text-xs text-stone">{z.countries.map(countryName).join(", ")}{z.regions.length ? ` — only ${z.regions.join(", ")}` : ""}</p>}
                  </div>
                  <a href={`?edit=${z.id}`} className="rounded-md border border-line px-3 py-1.5 text-xs hover:border-ink">Edit</a>
                  <DeleteZone id={z.id} name={z.name} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={editing ? `Edit ${editing.name}` : "Add a shipping zone"}>
          <ZoneForm
            key={editing?.id ?? "new"}
            currency={c}
            countries={countryOptions()}
            zone={editing ? { id: editing.id, name: editing.name, countries: editing.countries, regions: editing.regions.join(", "), fee: String(editing.fee / 100), freeOverAmount: editing.freeOverAmount ? String(editing.freeOverAmount / 100) : "", estimatedDelivery: editing.estimatedDelivery ?? "", isFallback: editing.isFallback, isActive: editing.isActive, sortOrder: editing.sortOrder } : null}
          />
        </Card>
      </div>
    </>
  );
}
