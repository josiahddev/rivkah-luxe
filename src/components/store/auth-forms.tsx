"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { forgotPassword, login, register, resetPassword } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { Checkbox, FormError, FormSuccess, Input } from "@/components/ui/form";
import { EyeIcon } from "@/components/ui/icons";

function PasswordInput({ name = "password", label = "Password", error, autoComplete = "current-password", hint }: { name?: string; label?: string; error?: string; autoComplete?: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input name={name} type={show ? "text" : "password"} label={label} required autoComplete={autoComplete} error={error} hint={hint} inputClassName="pr-12" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-[34px] p-1.5 text-stone hover:text-ink" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
        <EyeIcon size={18} />
      </button>
    </div>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <Input name="email" type="email" label="Email" required autoComplete="email" />
      <PasswordInput />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-stone underline underline-offset-4 hover:text-ink">Forgot your password?</Link>
      </div>
      <FormError message={state && !state.ok ? state.error : null} />
      <Button type="submit" size="lg" className="w-full" loading={pending} loadingText="Signing in…">Sign in</Button>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(register, null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <Input name="name" label="Full name" required autoComplete="name" error={fe.name} />
      <Input name="email" type="email" label="Email" required autoComplete="email" error={fe.email} />
      <Input name="phone" type="tel" label="Phone (optional)" autoComplete="tel" />
      <PasswordInput autoComplete="new-password" error={fe.password} hint="At least 8 characters, with a letter and a number." />
      <Checkbox name="marketing" label="Email me about new arrivals and offers" description="Optional. Unsubscribe any time." />
      <FormError message={state && !state.ok ? state.error : null} />
      <Button type="submit" size="lg" className="w-full" loading={pending} loadingText="Creating your account…">Create account</Button>
      <p className="text-center text-xs text-stone">
        By creating an account you agree to our <Link href="/terms-and-conditions" className="underline">Terms</Link> and <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPassword, null);
  if (state?.ok) return <FormSuccess message={state.message} />;
  return (
    <form action={action} className="space-y-5">
      <Input name="email" type="email" label="Email" required autoComplete="email" />
      <FormError message={state && !state.ok ? state.error : null} />
      <Button type="submit" size="lg" className="w-full" loading={pending} loadingText="Sending…">Send reset link</Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <PasswordInput label="New password" autoComplete="new-password" error={fe.password} hint="At least 8 characters, with a letter and a number." />
      <PasswordInput name="confirm" label="Confirm new password" autoComplete="new-password" error={fe.confirm} />
      <FormError message={state && !state.ok ? state.error : null} />
      <Button type="submit" size="lg" className="w-full" loading={pending} loadingText="Saving…">Set new password</Button>
    </form>
  );
}
