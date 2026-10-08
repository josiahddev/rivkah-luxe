import type { Metadata } from "next";
import { getCartView } from "@/lib/cart";
import { CartPageClient } from "@/components/store/cart-page";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };

export default async function CartPage() {
  const view = await getCartView();
  return (
    <div className="container-luxe py-14 sm:py-20">
      <h1 className="mb-10 font-display text-5xl">Your Bag</h1>
      <CartPageClient initial={view} />
    </div>
  );
}
