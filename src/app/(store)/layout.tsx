import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/permissions";
import { cartCount } from "@/lib/cart";
import { wishlistIds } from "@/server/shop";
import { CartProvider } from "@/components/store/cart-context";
import { CartDrawer } from "@/components/store/cart-drawer";
import { SiteHeader } from "@/components/store/header";
import { SiteFooter } from "@/components/store/footer";
import { WhatsAppFloat } from "@/components/store/whatsapp-button";
import { Logo } from "@/components/store/logo";
import { NewsletterForm } from "@/components/store/newsletter-form";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [settings, user, count, saved] = await Promise.all([getSettings(), getCurrentUser(), cartCount(), wishlistIds()]);

  if (!settings.storeOpen && !(user && isAdminRole(user.role))) {
    return (
      <main className="grid min-h-dvh place-items-center bg-ink px-6 text-center text-ivory">
        <div className="max-w-md">
          <Logo storeName={settings.storeName} logoUrl={settings.logoUrl} light />
          <h1 className="mt-10 font-display text-4xl italic">Something beautiful is coming.</h1>
          <p className="mt-4 text-mist">Our store is opening soon. Leave your email and be the first to know.</p>
          <div className="mt-8 text-left">
            <NewsletterForm source="coming-soon" dark />
          </div>
        </div>
      </main>
    );
  }

  return (
    <CartProvider initialCount={count} initialWishlist={saved}>
      {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
        <div className="bg-champagne px-4 py-2 text-center text-[0.72rem] font-medium text-ink">
          Preview of the Rivkah Luxe store — products and prices are samples and no real payments are taken.
        </div>
      )}
      {!settings.storeOpen && (
        <div className="bg-gold py-2 text-center text-xs font-medium text-ink">
          Your store is hidden from customers. Publish it in Admin → Settings when you&apos;re ready.
        </div>
      )}
      <SiteHeader />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <SiteFooter />
      <CartDrawer currency={settings.currency} />
      <WhatsAppFloat number={settings.whatsapp} storeName={settings.storeName} />
    </CartProvider>
  );
}
