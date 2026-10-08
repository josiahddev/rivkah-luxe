"use client";

import { useActionState } from "react";
import { subscribeNewsletter } from "@/server/shop";
import { Spinner } from "@/components/ui/button";
import { ArrowRight, CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function NewsletterForm({ source = "footer", dark }: { source?: string; dark?: boolean }) {
  const [state, action, pending] = useActionState(subscribeNewsletter, null);
  if (state?.ok) {
    return (
      <p role="status" className={cn("flex items-center gap-2 text-sm", dark ? "text-champagne" : "text-success")}>
        <CheckIcon size={18} /> {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="w-full">
      <input type="hidden" name="source" value={source} />
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <input type="hidden" name="consent" value="1" />
      <div className={cn("flex border-b transition-colors focus-within:border-gold", dark ? "border-ivory/40" : "border-ink")}>
        <label htmlFor={`nl-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`nl-${source}`}
          name="email"
          type="email"
          required
          placeholder="Your email address"
          autoComplete="email"
          className={cn("h-12 min-w-0 flex-1 bg-transparent text-[0.95rem] focus:outline-none", dark ? "text-ivory placeholder:text-mist" : "placeholder:text-mist")}
        />
        <button type="submit" disabled={pending} className={cn("eyebrow flex items-center gap-2 pl-4", dark ? "text-champagne hover:text-ivory" : "hover:text-gold-deep")} aria-label="Subscribe">
          {pending ? <Spinner /> : <>Subscribe <ArrowRight size={16} /></>}
        </button>
      </div>
      {state && !state.ok && <p role="alert" className="mt-2 text-xs text-[#e8a39d]">{state.error}</p>}
      <p className={cn("mt-3 text-[0.72rem] leading-relaxed", dark ? "text-mist" : "text-stone")}>
        By subscribing you agree to receive emails from us. Unsubscribe any time.
      </p>
    </form>
  );
}
