"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-none border border-line bg-white px-4 text-[0.95rem] text-ink placeholder:text-mist transition-colors duration-200 hover:border-mist focus:border-ink focus:outline-none focus-visible:outline-none disabled:bg-sand/60 disabled:text-stone aria-[invalid=true]:border-danger";

type FieldShell = { label?: ReactNode; hint?: ReactNode; error?: string; required?: boolean; className?: string; id?: string };

export function Field({ label, hint, error, required, className, id, children }: FieldShell & { children: (id: string, describedBy?: string) => ReactNode }) {
  const auto = useId();
  const fid = id ?? auto;
  const hintId = hint ? `${fid}-hint` : undefined;
  const errId = error ? `${fid}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={fid} className="block text-[0.78rem] font-medium tracking-wide text-charcoal">
          {label}
          {required && <span className="ml-0.5 text-gold-deep" aria-hidden="true">*</span>}
        </label>
      )}
      {children(fid, describedBy)}
      {hint && !error && (
        <p id={hintId} className="text-xs leading-relaxed text-stone">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldShell & { prefix?: string; inputClassName?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, className, inputClassName, id, prefix, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className} id={id}>
      {(fid, describedBy) => (
        <div className="relative">
          {prefix && <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-stone">{prefix}</span>}
          <input
            ref={ref}
            id={fid}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(fieldBase, "h-12", prefix && "pl-9", inputClassName)}
            {...rest}
          />
        </div>
      )}
    </Field>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldShell;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, required, className, id, rows = 4, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className} id={id}>
      {(fid, describedBy) => (
        <textarea
          ref={ref}
          id={fid}
          rows={rows}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(fieldBase, "py-3 leading-relaxed")}
          {...rest}
        />
      )}
    </Field>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & FieldShell & { options?: { value: string; label: string }[] };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, className, id, options, children, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className} id={id}>
      {(fid, describedBy) => (
        <div className="relative">
          <select
            ref={ref}
            id={fid}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(fieldBase, "h-12 appearance-none pr-10")}
            {...rest}
          >
            {options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            {children}
          </select>
          <svg className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-stone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      )}
    </Field>
  );
});

export function Checkbox({ label, description, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input id={rest.id ?? id} type="checkbox" className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-ink" {...rest} />
      <label htmlFor={rest.id ?? id} className="text-sm leading-snug text-charcoal">
        {label}
        {description && <span className="mt-0.5 block text-xs text-stone">{description}</span>}
      </label>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
      {message}
    </div>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="status" className="border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
      {message}
    </div>
  );
}
