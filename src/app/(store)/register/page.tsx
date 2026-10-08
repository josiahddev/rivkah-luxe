import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthShell } from "@/components/store/auth-shell";
import { RegisterForm } from "@/components/store/auth-forms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const raw = (await searchParams).next;
  const next = typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthShell
      eyebrow="Join us"
      title="Create an account"
      subtitle="Your orders, addresses and wishlist — all in one place."
      footer={<>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-ink underline underline-offset-4">Sign in</Link></>}
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
