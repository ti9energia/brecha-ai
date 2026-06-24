import Link from "next/link";
import { Logo } from "@/ui/Logo";
import { getT } from "@/i18n/server";
import type { Locale } from "@/i18n/config";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getT(locale, "landing");
  const tc = getT(locale, "common");
  const year = 2026;

  const cols = [
    {
      title: t("footerProduct"),
      links: [
        { label: t("nav.how"), href: "#how" },
        { label: t("nav.pricing"), href: "#pricing" },
        { label: t("nav.sectors"), href: "#sectors" },
      ],
    },
    {
      title: t("footerCompany"),
      links: [
        { label: "Manifesto", href: "#" },
        { label: "Blog", href: "#" },
        { label: "Carreiras", href: "#" },
      ],
    },
    {
      title: t("footerLegal"),
      links: [
        { label: "LGPD", href: "#" },
        { label: "Privacidade", href: "#" },
        { label: "Termos", href: "#" },
      ],
    },
  ];

  return (
    <footer className="relative border-t border-line mt-24">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Logo size={30} />
            <p className="mt-4 max-w-xs text-sm text-ink-3 text-pretty">{t("footerTagline")}</p>
            <p className="mt-6 mono text-xs text-ink-4">
              CNPJ 00.000.000/0001-00 · São Paulo / SP
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <p className="eyebrow mb-4">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-ink-2 hover:text-brand transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink-4">
            © {year} Brecha.ai · {tc("copyright")}
          </p>
          <p className="mono text-[0.7rem] text-ink-4">{t("trustLine")}</p>
        </div>
      </div>
    </footer>
  );
}
