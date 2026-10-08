import { WhatsAppIcon } from "@/components/ui/icons";
import { whatsappLink } from "@/lib/whatsapp";

export function WhatsAppFloat({ number, storeName }: { number: string; storeName: string }) {
  if (!number) return null;
  return (
    <a
      href={whatsappLink(number, `Hello ${storeName}, I have a question.`)}
      target="_blank"
      rel="noopener noreferrer"
      className="no-print group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-ink py-3 pl-3 pr-3 text-ivory shadow-[0_14px_30px_-12px_rgba(15,14,12,0.55)] transition-all duration-500 hover:pr-5 sm:bottom-6 sm:right-6"
      aria-label="Chat with us on WhatsApp"
    >
      <span className="grid size-8 place-items-center rounded-full bg-[#25D366] text-white">
        <WhatsAppIcon size={18} />
      </span>
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-[0.7rem] font-medium uppercase tracking-[0.14em] transition-all duration-500 group-hover:max-w-48">
        Chat with us
      </span>
    </a>
  );
}

export function WhatsAppInline({ number, message, label = "Chat with us on WhatsApp" }: { number: string; message?: string; label?: string }) {
  if (!number) return null;
  return (
    <a
      href={whatsappLink(number, message)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm text-charcoal underline decoration-gold/60 underline-offset-4 hover:text-ink"
    >
      <WhatsAppIcon size={18} className="text-[#1f9e55]" />
      {label}
    </a>
  );
}
