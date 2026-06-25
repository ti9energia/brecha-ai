import Link from "next/link";
import { ArrowLeft, ScrollText, Scale, ShieldCheck, FileText } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Eyebrow } from "@/ui/primitives";
import { getT } from "@/i18n/server";
import { resolveLocale } from "@/i18n/config";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getT(resolveLocale(locale), "legal");
  return { title: `${t("title")} — Brecha.ai`, description: t("intro") };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = getT(locale, "legal");

  const sections = [
    { id: "manifesto", icon: <ScrollText size={18} />, title: t("manifestoTitle"), body: t("manifestoBody") },
    { id: "termos", icon: <Scale size={18} />, title: t("termsTitle"), body: t("termsBody") },
    { id: "privacidade", icon: <ShieldCheck size={18} />, title: t("privacyTitle"), body: t("privacyBody") },
    { id: "lgpd", icon: <FileText size={18} />, title: t("lgpdTitle"), body: t("lgpdBody") },
  ];

  return (
    <div className="relative overflow-clip">
      <SiteHeader />
      <main className="relative pt-36 pb-10">
        <div className="aurora opacity-50" />
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6">
          <Link href={`/${locale}`} className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors mb-8">
            <ArrowLeft size={15} /> {t("back")}
          </Link>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h1 className="mt-4 display-2 font-bold text-ink text-balance">{t("title")}</h1>
          <p className="mt-5 text-lg text-ink-2 text-pretty max-w-2xl">{t("intro")}</p>
          <p className="mt-3 mono text-xs text-ink-4">{t("updated")}</p>

          {/* índice */}
          <nav className="mt-10 flex flex-wrap gap-2">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="chip hover:border-line-gold hover:text-brand transition-colors">
                {s.title}
              </a>
            ))}
          </nav>

          {/* seções */}
          <div className="mt-12 space-y-px rounded-[var(--radius-lg)] overflow-hidden border border-line bg-[color:var(--border)]">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-28 bg-surface p-7 sm:p-9">
                <div className="flex items-center gap-3 mb-4">
                  <span className="grid place-items-center size-9 rounded-[var(--radius-md)] border border-line-gold bg-[var(--brand-soft)] text-brand">
                    {s.icon}
                  </span>
                  <h2 className="font-display font-semibold text-xl text-ink">{s.title}</h2>
                </div>
                <p className="text-ink-2 leading-relaxed text-pretty">{s.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
