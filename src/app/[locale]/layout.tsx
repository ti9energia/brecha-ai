import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import { I18nProvider } from "@/i18n/provider";
import { getDictionary } from "@/i18n/dictionary";
import { getT } from "@/i18n/server";
import { isLocale, locales, localeMeta, defaultLocale, type Locale } from "@/i18n/config";
import { ThemeScript } from "@/ui/ThemeScript";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const viewport: Viewport = {
  // Acompanha o esquema do SO: tinta no escuro, pergaminho no claro (cores de --canvas).
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07080c" },
    { media: "(prefers-color-scheme: light)", color: "#f4f1e9" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap", weight: ["400", "500", "600", "700", "800"] });
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-jb", display: "swap", weight: ["400", "500", "600"] });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const typed = (isLocale(locale) ? locale : defaultLocale) as Locale;
  // Fonte única: chaves `meta.*` do catálogo i18n (com a cadeia de fallback).
  const t = getT(typed, "meta");
  const title = t("title");
  const description = t("description");
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://brecha.ai";
  const path = `/${typed}`;
  return {
    title,
    description,
    metadataBase: new URL(base),
    applicationName: "Brecha.ai",
    creator: "Brecha.ai",
    keywords: [
      "oportunidade regulatória", "reforma tributária", "CBS", "IBS", "planejamento tributário",
      "compliance fiscal", "regtech", "incentivos fiscais", "economia tributária", "diário oficial",
    ],
    // SEO internacional: canônica + hreflang das 4 versões (+ x-default).
    alternates: {
      canonical: path,
      languages: { ...Object.fromEntries(locales.map((l) => [l, `/${l}`])), "x-default": `/${defaultLocale}` },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    openGraph: {
      title, description, type: "website", url: path, siteName: "Brecha.ai",
      locale: localeMeta[typed].intl.replace("-", "_"),
    },
    twitter: { card: "summary_large_image", title, description },
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Brecha.ai" },
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typed = locale as Locale;
  const messages = getDictionary(typed);

  return (
    <html
      lang={localeMeta[typed].intl}
      dir="ltr"
      data-theme="dark"
      suppressHydrationWarning
      className={`${sora.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="grain min-h-dvh antialiased">
        <I18nProvider locale={typed} messages={messages}>
          {children}
        </I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
