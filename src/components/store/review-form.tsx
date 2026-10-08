"use client";

import { useActionState, useState } from "react";
import { submitReview } from "@/server/shop";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess, Input, Textarea } from "@/components/ui/form";
import { StarIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function ReviewForm({ productId, defaultName, defaultEmail }: { productId: string; defaultName?: string; defaultEmail?: string }) {
  const [state, action, pending] = useActionState(submitReview, null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [open, setOpen] = useState(false);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};

  if (state?.ok) return <FormSuccess message={state.message} />;
  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Write a review
      </Button>
    );

  return (
    <form action={action} className="max-w-xl space-y-5 border border-line bg-white p-6 sm:p-8">
      <h3 className="font-display text-2xl">Share your experience</h3>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <fieldset>
        <legend className="mb-2 text-[0.78rem] font-medium text-charcoal">Your rating <span className="text-gold-deep">*</span></legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              className={cn("p-0.5 transition-transform hover:scale-110", (hover || rating) >= n ? "text-gold" : "text-line")}
            >
              <StarIcon size={28} filled={(hover || rating) >= n} />
            </button>
          ))}
        </div>
        {fe.rating && <p className="mt-1 text-xs text-danger">{fe.rating}</p>}
      </fieldset>
      <Input name="title" label="Title" placeholder="Sum it up in a few words" maxLength={120} />
      <Textarea name="comment" label="Your review" required rows={5} error={fe.comment} placeholder="What did you love? How does it feel and smell?" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="name" label="Name" required defaultValue={defaultName} error={fe.name} autoComplete="name" />
        <Input name="email" type="email" label="Email" hint="Not shown publicly. Used to show a Verified Purchase badge." defaultValue={defaultEmail} error={fe.email} autoComplete="email" />
      </div>
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="flex gap-3">
        <Button type="submit" loading={pending} loadingText="Sending…">
          Submit review
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <p className="text-xs text-stone">Reviews are checked by our team before they appear.</p>
    </form>
  );
}
