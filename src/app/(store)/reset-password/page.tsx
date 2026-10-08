import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/auth/tokens";
import { AuthShell } from "@/components/store/auth-shell";
import { ResetForm } from "@/components/store/auth-forms";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";
  const row = token ? await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } }) : null;
  const valid = row && !row.usedAt && row.expiresAt > new Date();
  return (
    <AuthShell
      eyebrow="Account help"
      title={valid ? "Choose a new password" : "This link has expired"}
      subtitle={valid ? undefined : "Reset links are valid for 1 hour and can only be used once."}
      footer={<Link href="/login" className="text-ink underline underline-offset-4">Back to sign in</Link>}
    >
      {valid ? <ResetForm token={token} /> : <ButtonLink href="/forgot-password" className="w-full">Request a new link</ButtonLink>}
    </AuthShell>
  );
}
