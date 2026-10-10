"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/action";

type FormAction = (prev: unknown, fd: FormData) => Promise<ActionResult<unknown>>;

/**
 * A form wired to a server action that shows a toast on success/failure and
 * optionally redirects. Used by almost every admin screen.
 */
export function AdminForm({
  action,
  children,
  className,
  redirectTo,
  resetOnSuccess,
}: {
  action: FormAction;
  children: (state: { pending: boolean; errors: Record<string, string> }) => ReactNode;
  className?: string;
  redirectTo?: string | ((data: unknown) => string);
  resetOnSuccess?: boolean;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, null);
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast(state.message ?? "Saved.");
      if (redirectTo) router.push(typeof redirectTo === "function" ? redirectTo(state.data) : redirectTo);
      else router.refresh();
      if (resetOnSuccess) setFormKey((k) => k + 1);
    } else {
      toast(state.error, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form key={formKey} action={formAction} className={className}>
      {children({ pending, errors })}
    </form>
  );
}

/** Button that runs a server action after an "Are you sure?" dialog. */
export function ConfirmAction({
  action,
  label,
  title,
  message,
  confirmLabel,
  variant = "danger",
  size = "sm",
  successMessage = "Done.",
  redirectTo,
  className,
}: {
  action: () => Promise<ActionResult<unknown> | void>;
  label: ReactNode;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  variant?: "danger" | "outline" | "ghost" | "primary";
  size?: "sm" | "md";
  successMessage?: string;
  redirectTo?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} className={className}>
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        tone={variant === "danger" ? "danger" : "primary"}
        loading={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          start(async () => {
            const r = await action();
            setOpen(false);
            if (r && !r.ok) toast(r.error, "error");
            else {
              toast((r && r.message) || successMessage);
              if (redirectTo) router.push(redirectTo);
              else router.refresh();
            }
          })
        }
      />
    </>
  );
}

/** Small inline button that runs an action and refreshes (no confirmation). */
export function QuickAction({ action, children, className, success }: { action: () => Promise<ActionResult<unknown> | void>; children: ReactNode; className?: string; success?: string }) {
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className={className ?? "rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium hover:border-ink disabled:opacity-50"}
      onClick={() =>
        start(async () => {
          const r = await action();
          if (r && !r.ok) toast(r.error, "error");
          else {
            if (success || (r && r.message)) toast((r && r.message) || success!);
            router.refresh();
          }
        })
      }
    >
      {pending ? "…" : children}
    </button>
  );
}

export function SubmitBar({ pending, label = "Save changes", cancelHref, extra }: { pending: boolean; label?: string; cancelHref?: string; extra?: ReactNode }) {
  return (
    <div className="pb-safe sticky bottom-0 z-20 -mx-4 mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-ivory/95 px-4 pt-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
      {extra}
      {cancelHref && (
        <a href={cancelHref} className="rounded-md px-4 py-3 text-sm text-stone hover:text-ink">
          Cancel
        </a>
      )}
      <Button type="submit" size="lg" loading={pending} loadingText="Saving…" className="min-w-40 rounded-md">
        {label}
      </Button>
    </div>
  );
}
