import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: s.seo.defaultTitle, template: `%s | ${s.storeName}` },
    description: s.seo.defaultDescription,
    applicationName: s.storeName,
    icons: s.faviconUrl ? { icon: s.faviconUrl } : undefined,
    openGraph: {
      type: "website",
      siteName: s.storeName,
      title: s.seo.defaultTitle,
      description: s.seo.defaultDescription,
      images: s.seo.ogImageUrl ? [s.seo.ogImageUrl] : ["/demo/hero-packaging.webp"],
      locale: "en_NG",
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0f0e0c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-CA" className={`${cormorant.variable} ${jost.variable} antialiased`}>
      <body className="min-h-dvh">
        <div className="brand-veil" aria-hidden="true">
          <div className="brand-veil-mark text-center">
            <div className="font-display text-5xl italic">R/L</div>
            <div className="eyebrow mt-3 text-[0.65rem] text-champagne">Rivkah Luxe</div>
          </div>
        </div>
        <ToastProvider>{children}</ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
