import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ivory px-6 text-center">
      <div className="max-w-md">
        <p className="font-display text-7xl italic text-gold-deep">404</p>
        <h1 className="mt-4 font-display text-4xl">This page has slipped away.</h1>
        <p className="mt-4 text-stone">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="inline-flex h-12 items-center bg-ink px-6 text-[0.72rem] font-medium uppercase tracking-[0.2em] text-ivory hover:bg-ink-soft">Home</Link>
          <Link href="/shop" className="inline-flex h-12 items-center border border-ink px-6 text-[0.72rem] font-medium uppercase tracking-[0.2em] hover:bg-ink hover:text-ivory">Shop</Link>
        </div>
      </div>
    </main>
  );
}
