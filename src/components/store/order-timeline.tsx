import { cn, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABEL, TRACKING_STEPS } from "@/lib/order-status";
import { CheckIcon } from "@/components/ui/icons";
import type { OrderStatus } from "@/generated/prisma/enums";

export function OrderTimeline({ status, history }: { status: OrderStatus; history: { status: OrderStatus; createdAt: Date; note: string | null }[] }) {
  if (status === "CANCELLED" || status === "REFUNDED" || status === "PENDING") {
    const last = history[history.length - 1];
    return (
      <div className="border border-line bg-white p-6">
        <p className="font-display text-2xl">{status === "PENDING" ? "Waiting for payment" : ORDER_STATUS_LABEL[status]}</p>
        <p className="mt-2 text-sm text-stone">
          {status === "PENDING"
            ? "We haven't received payment for this order yet."
            : status === "CANCELLED"
              ? "This order was cancelled. If you paid, your refund will be processed to your original payment method."
              : "This order has been refunded to your original payment method."}
        </p>
        {last?.note && status !== "PENDING" && <p className="mt-3 text-sm italic text-charcoal">{last.note}</p>}
      </div>
    );
  }
  const current = TRACKING_STEPS.indexOf(status);
  return (
    <ol className="relative space-y-0" aria-label="Order progress">
      {TRACKING_STEPS.map((step, i) => {
        const done = i <= current;
        const when = history.find((h) => h.status === step);
        return (
          <li key={step} className="relative flex gap-4 pb-7 last:pb-0">
            {i < TRACKING_STEPS.length - 1 && <span className={cn("absolute left-[11px] top-6 h-full w-px", i < current ? "bg-gold" : "bg-line")} aria-hidden="true" />}
            <span className={cn("relative z-10 grid size-6 shrink-0 place-items-center rounded-full border", done ? "border-gold bg-gold text-ink" : "border-line bg-ivory")}>
              {done && <CheckIcon size={13} />}
            </span>
            <div className="-mt-0.5">
              <p className={cn("text-sm", i === current ? "font-medium text-ink" : done ? "text-charcoal" : "text-mist")}>{ORDER_STATUS_LABEL[step]}</p>
              {when && <p className="text-xs text-stone">{formatDateTime(when.createdAt)}</p>}
              {when?.note && i === current && step !== "PAYMENT_CONFIRMED" && <p className="mt-1 text-xs italic text-charcoal">{when.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
