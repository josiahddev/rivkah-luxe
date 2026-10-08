import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthShell } from "@/components/store/auth-shell";
import { LoginForm } from "@/components/store/auth-forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

function safe(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safe((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Track orders, save favourites and check out faster."
      footer={<>New to Rivkah Luxe? <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-ink underline underline-offset-4">Create an account</Link></>}
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
