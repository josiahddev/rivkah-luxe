import Link from "next/link";

export const metadata = { title: "No access", robots: { index: false } };

export default function NoAccessPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f8f5ef] px-6 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-4xl">You don&apos;t have access to this page.</h1>
        <p className="mt-3 text-stone">Your team role doesn&apos;t include this area. Ask the store owner if you need access.</p>
        <Link href="/admin" className="mt-8 inline-block rounded-md bg-ink px-6 py-3 text-sm font-medium text-ivory">Back to dashboard</Link>
      </div>
    </main>
  );
}
