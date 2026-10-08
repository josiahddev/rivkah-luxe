import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { cardSelect, toCard } from "@/lib/catalog";
import { getDisplayCurrency } from "@/lib/currency";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, SectionHeading } from "@/components/ui/bits";
import { HeartIcon } from "@/components/ui/icons";
import { ProductCard } from "@/components/store/product-card";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="container-luxe py-20">
        <EmptyState icon={<HeartIcon size={26} />} title="Save your favourites here." message="Sign in to keep a wishlist you can come back to on any device.">
          <ButtonLink href="/login?next=/wishlist">Sign in</ButtonLink>
          <ButtonLink href="/register?next=/wishlist" variant="outline">Create account</ButtonLink>
        </EmptyState>
      </div>
    );
  }
  const [items, cur] = await Promise.all([
    db.wishlistItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { product: { select: cardSelect } } }),
    getDisplayCurrency(),
  ]);
  const cards = items.map((i) => toCard(i.product, cur));
  return (
    <div className="container-luxe py-14 sm:py-20">
      <SectionHeading as="h1" eyebrow="Saved for later" title="Your wishlist" className="mb-12" />
      {cards.length === 0 ? (
        <EmptyState icon={<HeartIcon size={26} />} title="Save your favourites here." message="Tap the heart on any product to keep it for later.">
          <ButtonLink href="/shop">Explore the collection</ButtonLink>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:grid-cols-4 md:gap-x-6">
          {cards.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
