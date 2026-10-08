"use client";

import { useActionState } from "react";
import { submitContact } from "@/server/shop";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess, Input, Textarea } from "@/components/ui/form";

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  if (state?.ok) return <FormSuccess message={state.message} />;
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <Input name="name" label="Name" required autoComplete="name" error={fe.name} />
      <Input name="email" type="email" label="Email" required autoComplete="email" error={fe.email} />
      <Input name="phone" type="tel" label="Phone (optional)" autoComplete="tel" />
      <Input name="subject" label="Subject" required error={fe.subject} />
      <Textarea name="message" label="Message" required rows={6} error={fe.message} className="sm:col-span-2" />
      <div className="sm:col-span-2 space-y-4">
        <FormError message={state && !state.ok ? state.error : null} />
        <Button type="submit" size="lg" loading={pending} loadingText="Sending…">Send message</Button>
      </div>
    </form>
  );
}
