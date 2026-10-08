"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { checkPayment, retryPayment, simulateTestPayment } from "@/server/checkout";
import { Button, Spinner } from "@/components/ui/button";
import { FormError } from "@/components/ui/form";

export function PaymentPending({ reference, cancelled, orderNumber, email }: { reference: string; cancelled?: boolean; orderNumber?: string; email?: string }) {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  const [outcome, setOutcome] = useState<string>("pending");

  useEffect(() => {
    if (outcome !== "pending" || tries > 40) return;
    const t = setTimeout(async () => {
      const r = await checkPayment(reference);
      setOutcome(r.outcome);
      setTries((n) => n + 1);
      if (r.outcome === "paid" || r.outcome === "already-paid") router.replace(`/checkout/success?reference=${encodeURIComponent(reference)}`);
      else if (r.outcome !== "pending") router.refresh();
    }, tries === 0 ? 1200 : 3000);
    return () => clearTimeout(t);
  }, [tries, outcome, reference, router]);

  const gaveUp = tries > 40;

  return (
    <div className="mx-auto max-w-md text-center" role="status" aria-live="polite">
      {!gaveUp ? (
        <>
          <div className="mx-auto mb-8 grid size-16 place-items-center rounded-full border border-gold/40 text-gold">
            <Spinner className="size-6" />
          </div>
          <h1 className="font-display text-4xl">Processing payment…</h1>
          <p className="mt-4 text-stone">
            {cancelled
              ? "It looks like the payment window was closed. We're double-checking with the payment provider."
              : "We're confirming your payment with the payment provider. This usually takes a few seconds — please don't close this page."}
          </p>
          {cancelled && orderNumber && email && (
            <div className="mt-8">
              <RetryPayment orderNumber={orderNumber} email={email} />
            </div>
          )}
        </>
      ) : (
        <>
          <h1 className="font-display text-4xl">Still confirming…</h1>
          <p className="mt-4 text-stone">
            Your bank is taking a little longer than usual. You&apos;ll receive an email as soon as your payment is confirmed. If you were charged and don&apos;t hear from us within an hour, please contact us with reference <strong>{reference}</strong>.
          </p>
          {orderNumber && email && (
            <div className="mt-8">
              <RetryPayment orderNumber={orderNumber} email={email} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function RetryPayment({ orderNumber, email }: { orderNumber: string; email: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <Button
        loading={busy}
        loadingText="Taking you to secure payment…"
        onClick={async () => {
          setBusy(true);
          setError(null);
          const r = await retryPayment(orderNumber, email);
          if (r.ok && r.data) window.location.assign(r.data.redirectUrl);
          else {
            setBusy(false);
            setError(r.ok ? null : r.error);
          }
        }}
      >
        Try payment again
      </Button>
      <FormError message={error} />
    </div>
  );
}

export function TestPaymentPanel({ reference, amount }: { reference: string; amount: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const go = async (o: "success" | "failed" | "cancelled") => {
    setBusy(o);
    await simulateTestPayment(reference, o);
    router.push(`/checkout/verify?reference=${encodeURIComponent(reference)}`);
  };
  return (
    <div className="mx-auto max-w-md border border-dashed border-gold bg-white p-8 text-center">
      <p className="eyebrow text-gold-deep">Development only</p>
      <h1 className="mt-3 font-display text-3xl">Test payment</h1>
      <p className="mt-3 text-sm text-stone">
        This page stands in for Stripe/Paystack while you test locally. No real money moves. Amount: <strong>{amount}</strong>
      </p>
      <div className="mt-6 grid gap-3">
        <Button onClick={() => go("success")} loading={busy === "success"}>Simulate successful payment</Button>
        <Button variant="outline" onClick={() => go("failed")} loading={busy === "failed"}>Simulate failed payment</Button>
        <Button variant="ghost" onClick={() => go("cancelled")} loading={busy === "cancelled"}>Cancel payment</Button>
      </div>
      <p className="mt-4 text-xs text-stone">Ref: {reference}</p>
    </div>
  );
}
