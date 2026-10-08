"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon } from "./icons";

type Tone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: Tone; action?: { label: string; href: string } };

const ToastCtx = createContext<{ toast: (message: string, tone?: Tone, action?: Toast["action"]) => void }>({ toast: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message: string, tone: Tone = "success", action?: Toast["action"]) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { id, message, tone, action }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3800);
    },
    [dismiss],
  );

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const Icon = toast.tone === "success" ? CheckIcon : toast.tone === "error" ? AlertIcon : InfoIcon;
  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-center gap-3 border bg-ink px-4 py-3.5 text-sm text-ivory shadow-[0_18px_40px_-18px_rgba(15,14,12,0.6)] transition-all duration-500 ease-[var(--ease-luxe)]",
        toast.tone === "error" ? "border-danger/60" : "border-gold/40",
        shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
    >
      <Icon size={18} className={toast.tone === "error" ? "text-[#f0a49e]" : "text-champagne"} />
      <span className="flex-1 leading-snug">{toast.message}</span>
      {toast.action && (
        <a href={toast.action.href} className="eyebrow text-champagne underline underline-offset-4">
          {toast.action.label}
        </a>
      )}
      <button onClick={onClose} className="-mr-1 p-1 text-mist hover:text-ivory" aria-label="Dismiss">
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
