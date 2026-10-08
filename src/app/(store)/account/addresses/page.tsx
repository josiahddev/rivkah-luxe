import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { countryOptions } from "@/lib/regions";
import { AddressBook } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "My addresses", robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  return (
    <div>
      <h2 className="mb-6 font-display text-3xl">Addresses</h2>
      <AddressBook addresses={addresses} countries={countryOptions()} />
    </div>
  );
}
