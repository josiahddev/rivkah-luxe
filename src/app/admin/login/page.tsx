import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/permissions";
import { AdminLoginForm } from "@/components/admin/login-form";
import { BrandLogo } from "@/components/store/logo";

export const metadata: Metadata = { title: "Dashboard sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user && isAdminRole(user.role)) redirect("/admin");
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-5 py-12">
      <div className="w-full max-w-md rounded-lg bg-ivory p-8 shadow-2xl sm:p-10">
        <BrandLogo preload className="mx-auto h-24" />
        <h1 className="mt-6 text-center font-display text-3xl">Store dashboard</h1>
        <p className="mt-2 text-center text-sm text-stone">Sign in to manage your store.</p>
        <div className="mt-8">
          <AdminLoginForm />
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/forgot-password" className="text-stone underline underline-offset-4 hover:text-ink">Forgot password?</Link>
        </p>
        {user && <p className="mt-4 rounded-md bg-sand p-3 text-center text-xs text-charcoal">You&apos;re signed in as a customer. Sign in with an admin account to continue.</p>}
      </div>
    </main>
  );
}
