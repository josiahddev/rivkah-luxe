"use client";

import { createContext, useCallback, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart, applyCoupon, getCart, removeCoupon, updateCartItem } from "@/server/cart";
import { toggleWishlist } from "@/server/shop";
import { useToast } from "@/components/ui/toast";
import type { CartView } from "@/lib/cart";

type CartCtx = {
  count: number;
  view: CartView | null;
  isOpen: boolean;
  pending: boolean;
  bump: number;
  open: () => void;
  close: () => void;
  add: (variantId: string, quantity?: number, opts?: { openDrawer?: boolean }) => Promise<boolean>;
  setQty: (itemId: string, quantity: number) => Promise<void>;
  coupon: (code: string) => Promise<boolean>;
  clearCoupon: () => Promise<void>;
  refresh: () => Promise<void>;
  wishlist: Set<string>;
  toggleSaved: (productId: string) => Promise<void>;
};

const Ctx = createContext<CartCtx | null>(null);

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}

export function CartProvider({
  children,
  initialCount,
  initialWishlist,
}: {
  children: React.ReactNode;
  initialCount: number;
  initialWishlist: string[];
}) {
  const [count, setCount] = useState(initialCount);
  const [view, setView] = useState<CartView | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [bump, setBump] = useState(0);
  const [wishlist, setWishlist] = useState(() => new Set(initialWishlist));
  const { toast } = useToast();
  const router = useRouter();

  const apply = useCallback((v: CartView) => {
    setView(v);
    setCount(v.count);
  }, []);

  const refresh = useCallback(async () => {
    apply(await getCart());
  }, [apply]);

  const open = useCallback(() => {
    setOpen(true);
    startTransition(async () => {
      apply(await getCart());
    });
  }, [apply]);

  const close = useCallback(() => setOpen(false), []);

  const add = useCallback(
    async (variantId: string, quantity = 1, opts: { openDrawer?: boolean } = {}) => {
      const res = await addToCart(variantId, quantity);
      if (res.cart) apply(res.cart);
      if (!res.ok) {
        toast(res.error, "error");
        return false;
      }
      setBump((b) => b + 1);
      if (opts.openDrawer !== false) setOpen(true);
      else toast(res.message ?? "Added to your bag.", "success");
      return true;
    },
    [apply, toast],
  );

  const setQty = useCallback(
    async (itemId: string, quantity: number) => {
      const res = await updateCartItem(itemId, quantity);
      if (res.cart) apply(res.cart);
      if (!res.ok) toast(res.error, "error");
      router.refresh();
    },
    [apply, toast, router],
  );

  const coupon = useCallback(
    async (code: string) => {
      const res = await applyCoupon(code);
      if (res.cart) apply(res.cart);
      if (!res.ok) {
        toast(res.error, "error");
        return false;
      }
      toast(res.message ?? "Code applied.");
      router.refresh();
      return true;
    },
    [apply, toast, router],
  );

  const clearCoupon = useCallback(async () => {
    const res = await removeCoupon();
    if (res.cart) apply(res.cart);
    router.refresh();
  }, [apply, router]);

  const toggleSaved = useCallback(
    async (productId: string) => {
      const was = wishlist.has(productId);
      setWishlist((s) => {
        const n = new Set(s);
        if (was) n.delete(productId);
        else n.add(productId);
        return n;
      });
      const res = await toggleWishlist(productId);
      if (res.needsLogin) {
        setWishlist((s) => {
          const n = new Set(s);
          n.delete(productId);
          return n;
        });
        toast("Sign in to save your favourites.", "info", { label: "Sign in", href: `/login?next=${encodeURIComponent(location.pathname)}` });
        return;
      }
      if (!res.ok) {
        setWishlist((s) => {
          const n = new Set(s);
          if (was) n.add(productId);
          else n.delete(productId);
          return n;
        });
        toast(res.error ?? "Something went wrong.", "error");
        return;
      }
      toast(res.saved ? "Saved to your wishlist." : "Removed from your wishlist.", "success", res.saved ? { label: "View", href: "/wishlist" } : undefined);
    },
    [wishlist, toast],
  );

  return (
    <Ctx.Provider value={{ count, view, isOpen, pending, bump, open, close, add, setQty, coupon, clearCoupon, refresh, wishlist, toggleSaved }}>
      {children}
    </Ctx.Provider>
  );
}
