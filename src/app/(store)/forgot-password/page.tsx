import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/store/auth-shell";
import { ForgotForm } from "@/components/store/auth-forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account help"
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to choose a new one."
      footer={<Link href="/login" className="text-ink underline underline-offset-4">Back to sign in</Link>}
    >
      <ForgotForm />
    </AuthShell>
  );
}
