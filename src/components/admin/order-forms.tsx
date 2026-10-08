"use client";

import { useRef, useState } from "react";
import { addOrderNote, clearOrderAttention, updateOrderStatus } from "@/server/admin/orders";
import { ORDER_STATUS_HELP, ORDER_STATUS_LABEL } from "@/lib/order-status";
import { Checkbox, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AdminForm, QuickAction } from "./client-ui";
import type { OrderStatus } from "@/generated/prisma/enums";

const FLOW: OrderStatus[] = ["PAYMENT_CONFIRMED", "PROCESSING", "READY_FOR_DELIVERY", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

export function OrderStatusForm({ orderId, current, paid }: { orderId: string; current: OrderStatus; paid: boolean }) {
  const [status, setStatus] = useState<OrderStatus>(current);
  const [confirming, setConfirming] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);
  const nextStep = FLOW[FLOW.indexOf(current) + 1];
  const options = paid ? [...FLOW, "CANCELLED", "REFUNDED"] as OrderStatus[] : (["PENDING", "CANCELLED"] as OrderStatus[]);
  const dangerous = status === "CANCELLED" || status === "REFUNDED";

  return (
    <AdminForm action={updateOrderStatus}>
      {({ pending }) => (
        <div className="space-y-4">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="status" value={status} />
          {nextStep && status === current && (
            <p className="text-sm">
              Next step: <button type="button" onClick={() => setStatus(nextStep)} className="font-medium text-gold-deep underline underline-offset-4">mark as {ORDER_STATUS_LABEL[nextStep]}</button>
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            {options.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
                className={cn(
                  "rounded-md border px-3 py-3 text-left text-sm transition-colors",
                  status === s ? (s === "CANCELLED" || s === "REFUNDED" ? "border-danger bg-danger-soft" : "border-ink bg-ink text-ivory") : "border-line bg-white hover:border-ink",
                )}
              >
                <span className="font-medium">{ORDER_STATUS_LABEL[s]}</span>
                {s === current && <span className="ml-1 text-xs opacity-70">(now)</span>}
              </button>
            ))}
          </div>
          <p className="text-sm text-stone">{ORDER_STATUS_HELP[status]}</p>
          <Textarea name="note" label="Message for the customer (optional)" rows={2} placeholder="e.g. Tracking number: 1Z999…, or Canada Post link" hint="Included in their email and shown on their tracking page." />
          <Checkbox name="notify" defaultChecked label="Email the customer about this update" />
          {dangerous ? (
            <>
              <Button variant="danger" size="lg" className="rounded-md" disabled={status === current} onClick={() => setConfirming(true)}>
                {status === "CANCELLED" ? "Cancel order" : "Mark as refunded"}
              </Button>
              <ConfirmDialog
                open={confirming}
                title={status === "CANCELLED" ? "Cancel this order?" : "Mark as refunded?"}
                message={
                  status === "REFUNDED"
                    ? "Make sure you've refunded the money in Stripe or Paystack first. The items will be added back to your stock."
                    : paid
                      ? "The items will be added back to your stock. Remember to refund the customer in Stripe or Paystack."
                      : "This order wasn't paid, so no refund is needed."
                }
                confirmLabel="Yes, continue"
                loading={pending}
                onCancel={() => setConfirming(false)}
                onConfirm={() => {
                  setConfirming(false);
                  submitRef.current?.click();
                }}
              />
              <button ref={submitRef} type="submit" hidden />
            </>
          ) : (
            <Button type="submit" size="lg" className="rounded-md" loading={pending} loadingText="Updating…" disabled={status === current}>
              Update to {ORDER_STATUS_LABEL[status]}
            </Button>
          )}
        </div>
      )}
    </AdminForm>
  );
}

export function OrderNoteForm({ orderId }: { orderId: string }) {
  return (
    <AdminForm action={addOrderNote} resetOnSuccess>
      {({ pending }) => (
        <div className="space-y-3">
          <input type="hidden" name="orderId" value={orderId} />
          <Textarea name="body" rows={2} placeholder="e.g. Customer asked for gift wrap. Called on Tuesday." aria-label="Internal note" />
          <Button type="submit" variant="outline" size="sm" className="rounded-md" loading={pending}>Add note</Button>
        </div>
      )}
    </AdminForm>
  );
}

export function ResolveAttention({ orderId }: { orderId: string }) {
  return <QuickAction action={() => clearOrderAttention(orderId)} className="rounded-md border border-danger bg-white px-3 py-1.5 text-xs font-medium text-danger">Mark as resolved</QuickAction>;
}
