import Image from "next/image";

export function AuthShell({ eyebrow, title, subtitle, children, footer }: { eyebrow: string; title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100dvh-7.5rem)] lg:grid-cols-2">
      <div className="relative hidden bg-ink lg:block">
        <Image src="/demo/hero-packaging.webp" alt="" fill sizes="50vw" className="object-cover opacity-90" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-12 text-ivory">
          <p className="font-display text-4xl italic">Glow in luxury.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-14 sm:px-10">
        <div className="w-full max-w-md animate-fade-up">
          <p className="eyebrow text-gold-deep">{eyebrow}</p>
          <h1 className="mt-3 font-display text-5xl leading-tight">{title}</h1>
          {subtitle && <p className="mt-3 text-stone">{subtitle}</p>}
          <div className="mt-10">{children}</div>
          {footer && <div className="mt-8 border-t border-line pt-6 text-center text-sm text-stone">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
