import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { HeaderClient } from "./header-client";
import { enabledCurrencies, getDisplayCurrency } from "@/lib/currency";

export async function SiteHeader() {
  const [settings, categories, collections, user, currencies, current] = await Promise.all([
    getSettings(),
    db.category.findMany({ where: { isActive: true, parentId: null }, orderBy: { sortOrder: "asc" }, select: { name: true, slug: true, imageUrl: true } }),
    db.collection.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { name: true, slug: true } }),
    getCurrentUser(),
    enabledCurrencies(),
    getDisplayCurrency(),
  ]);
  const messages = settings.announcement.enabled ? settings.announcement.messages.filter(Boolean) : [];
  return (
    <HeaderClient
      storeName={settings.storeName}
      logoUrl={settings.logoUrl}
      announcements={messages}
      announcementLink={settings.announcement.link}
      categories={categories}
      collections={collections}
      signedIn={!!user}
      userName={user?.name.split(" ")[0] ?? null}
      isAdmin={!!user && user.role !== "CUSTOMER"}
      currency={current.code}
      currencies={currencies.map((c) => c.code)}
    />
  );
}
