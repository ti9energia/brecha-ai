import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import { I18nProvider } from "@/i18n/provider";
import { getDictionary } from "@/i18n/dictionary";
import { isLocale, locales, localeMeta, type Locale } from "@/i18n/config";
import { ThemeScript } from "@/ui/ThemeScript";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const viewport: Viewport = {
  themeColor: "#07080c",
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
  const titles: Record<string, string> = {
    "pt-BR": "Brecha.ai — Capture a oportunidade regulatória antes da janela fechar",
    en: "Brecha.ai — Capture the regulatory opportunity before the window closes",
    "zh-CN": "Brecha.ai — 在监管窗口关闭前抓住机会",
    "fr-FR": "Brecha.ai — Saisissez l'opportunité réglementaire avant la fermeture",
  };
  const desc: Record<string, string> = {
    "pt-BR": "GPS de oportunidade regulatória: detecta a janela, simula a jogada e executa a reorganização ótima antes de fechar.",
    en: "Regulatory opportunity GPS: detect the window, simulate the move, execute the optimal restructuring before it closes.",
    "zh-CN": "监管机会 GPS：发现窗口、模拟方案，并在关闭前执行最优重组。",
    "fr-FR": "GPS d'opportunité réglementaire : détecter la fenêtre, simuler le coup, exécuter la réorganisation optimale.",
  };
  return {
    title: titles[locale] ?? titles["pt-BR"],
    description: desc[locale] ?? desc["pt-BR"],
    metadataBase: new URL("https://brecha.ai"),
    applicationName: "Brecha.ai",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Brecha.ai" },
    formatDetection: { telephone: false },
    openGraph: { title: titles[locale] ?? titles["pt-BR"], description: desc[locale] ?? desc["pt-BR"], type: "website" },
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
