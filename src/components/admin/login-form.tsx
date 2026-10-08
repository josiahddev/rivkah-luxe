"use client";

import { useActionState } from "react";
import { adminLogin } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { FormError, Input } from "@/components/ui/form";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, null);
  return (
    <form action={action} className="space-y-5">
      <Input name="email" type="email" label="Email" required autoComplete="email" />
      <Input name="password" type="password" label="Password" required autoComplete="current-password" />
      <FormError message={state && !state.ok ? state.error : null} />
      <Button type="submit" size="lg" className="w-full rounded-md" loading={pending} loadingText="Signing in…">Sign in</Button>
    </form>
  );
}
