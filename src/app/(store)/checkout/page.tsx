import type { Metadata } from "next";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getCartView } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth/session";
import { getDisplayCurrency } from "@/lib/currency";
import { chargeCurrency } from "@/lib/orders";
import { providerForCurrency } from "@/lib/payments";
import { countryOptions } from "@/lib/regions";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/bits";
import { BagIcon } from "@/components/ui/icons";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [user, display, h] = await Promise.all([getCurrentUser(), getDisplayCurrency(), headers()]);
  const addresses = user ? await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) : [];
  const def = addresses[0];
  const geoCountry = h.get("x-vercel-ip-country")?.toUpperCase();
  const initialCountry = def?.country ?? (geoCountry && geoCountry.length === 2 ? geoCountry : "CA");
  const view = await getCartView({ country: initialCountry, region: def?.state ?? null, email: user?.email ?? null });

  if (view.lines.length === 0) {
    return (
      <div className="container-luxe py-20">
        <EmptyState icon={<BagIcon size={26} />} title="Your bag is waiting for something beautiful." message="Add a few favourites before checking out.">
          <ButtonLink href="/shop">Shop the collection</ButtonLink>
        </EmptyState>
      </div>
    );
  }

  const charge = await chargeCurrency(display.code);
  const provider = charge ? providerForCurrency(charge.code) : null;

  return (
    <div className="container-luxe py-12 sm:py-16">
      <h1 className="mb-10 font-display text-5xl">Checkout</h1>
      <CheckoutForm
        initialView={view}
        initialCountry={initialCountry}
        countries={countryOptions()}
        user={user ? { name: user.name, email: user.email, phone: user.phone } : null}
        addresses={addresses.map((a) => ({
          id: a.id, label: a.label, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2,
          city: a.city, state: a.state, postalCode: a.postalCode, country: a.country,
        }))}
        payment={{
          available: Boolean(provider),
          providerLabel: provider?.name === "paystack" ? "Paystack" : provider?.name === "stripe" ? "Stripe" : provider ? "Test payment (development)" : "",
          chargeCurrency: charge?.code ?? display.code,
          displayCurrency: display.code,
        }}
      />
    </div>
  );
}
