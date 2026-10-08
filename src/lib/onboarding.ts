import "server-only";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { paymentStatusSummary } from "@/lib/payments";

export type SetupStep = { key: string; title: string; description: string; href: string; done: boolean; cta: string };

/** The first-time setup guide. Each step is worked out from real store data. */
export async function setupSteps(): Promise<SetupStep[]> {
  const [settings, ownProducts, withPhotos, priced, shippingEdits, homepageEdits] = await Promise.all([
    getSettings(),
    db.product.count({ where: { isDemo: false } }),
    db.product.count({ where: { isDemo: false, images: { some: {} } } }),
    db.productVariant.count({ where: { product: { isDemo: false }, price: { gt: 0 } } }),
    db.auditLog.count({ where: { entityType: "ShippingZone" } }),
    db.auditLog.count({ where: { entityType: { in: ["Homepage", "Settings"] } } }),
  ]);
  const pay = paymentStatusSummary();
  return [
    { key: "product", title: "Add your first product", description: "Name, description and category of something you sell.", href: "/admin/products/new", cta: "Add product", done: ownProducts > 0 },
    { key: "photos", title: "Add product photos", description: "Drag photos onto a product. We resize them automatically.", href: "/admin/products", cta: "Add photos", done: withPhotos > 0 },
    { key: "prices", title: "Set your prices", description: "Prices are in Canadian dollars; other currencies convert automatically.", href: "/admin/products", cta: "Set prices", done: priced > 0 },
    { key: "shipping", title: "Set your shipping fees", description: "Choose fees for Canada, the US, Nigeria and the rest of the world.", href: "/admin/shipping", cta: "Set shipping", done: shippingEdits > 0 },
    { key: "payments", title: "Connect payments", description: "Stripe for cards in CAD/USD, Paystack for naira. Your developer adds the keys once.", href: "/admin/settings?tab=payments", cta: "Check payments", done: pay.stripe.connected || pay.paystack.connected },
    { key: "homepage", title: "Customise your homepage", description: "Change the main photo, headline and banners.", href: "/admin/content/homepage", cta: "Edit homepage", done: homepageEdits > 0 },
    { key: "publish", title: "Publish your store", description: "Remove the demo products, then make your store visible to customers.", href: "/admin/settings?tab=publish", cta: "Publish", done: settings.storeOpen && ownProducts > 0 },
  ];
}
