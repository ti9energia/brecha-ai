"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Mark } from "@/ui/Logo";
import { buttonClass } from "@/ui/primitives";
import { useTranslations, useLocale } from "@/i18n/provider";

export default function NotFound() {
  const t = useTranslations("errorPages");
  const locale = useLocale();

  return (
    <main className="relative min-h-dvh grid place-items-center overflow-hidden px-6">
      <div className="aurora opacity-50" />
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40" />
      <div className="relative text-center max-w-md">
        <Mark size={56} className="mx-auto mb-8 animate-[float_7s_ease-in-out_infinite]" />
        <p className="mono text-sm tracking-[0.3em] text-brand">{t("notFoundCode")}</p>
        <h1 className="mt-3 font-display font-bold text-3xl sm:text-4xl text-ink text-balance">{t("notFoundTitle")}</h1>
        <p className="mt-4 text-ink-3 text-pretty">{t("notFoundBody")}</p>
        <Link href={`/${locale}`} className={buttonClass("primary", "lg", "mt-8 group")}>
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
          {t("backHome")}
        </Link>
      </div>
    </main>
  );
}
