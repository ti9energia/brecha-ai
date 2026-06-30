"use client";

import { useEffect, useState } from "react";
import { Radar, Bot, ShieldCheck, Globe } from "lucide-react";
import { api } from "@/lib/api/client";
import type { OppSummary } from "@/lib/api/types";
import { useLocale, useTranslations, useFormatter } from "@/i18n/provider";
import { localeMeta } from "@/i18n/config";

export function StatusBar() {
  const locale = useLocale();
  const t = useTranslations("status");
  const fmt = useFormatter();
  const [summary, setSummary] = useState<OppSummary | null>(null);
  const [recsCount, setRecsCount] = useState(0);
  const [clock, setClock] = useState<string>("--:--:--");

  // Carrega sumário e recomendações via API — store.ts é server-only (Onda 6).
  useEffect(() => {
    api.opportunities.summary().then((s) => setSummary(s)).catch(() => {});
    api.agent.recommendations().then((r) => setRecsCount(r.length)).catch(() => {});
  }, []);

  useEffect(() => {
    const tick = () =>
      setClock(new Intl.DateTimeFormat(localeMeta[locale].intl, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [locale]);

  return (
    <footer className="flex items-center gap-4 h-7 px-3 border-t border-line bg-[var(--canvas-deep)] mono text-[0.66rem] text-ink-4 shrink-0 overflow-hidden">
      <span className="flex items-center gap-1.5 text-positive uppercase tracking-wide">
        <span className="relative grid place-items-center">
          <Radar size={11} />
        </span>
        {t("radarActive")}
      </span>
      <span className="hidden sm:inline">{fmt.number(1247)} {t("sourcesLabel")}</span>
      <span className="hidden md:inline text-brand">{summary?.openWindows ?? "—"} {t("windowsLabel")}</span>
      <span className="hidden lg:flex items-center gap-1.5"><Bot size={11} /> {recsCount} {t("recsLabel")}</span>

      <span className="ml-auto hidden sm:flex items-center gap-1.5"><ShieldCheck size={11} className="text-positive" /> {t("auditActive")}</span>
      <span className="flex items-center gap-1.5"><Globe size={11} /> {localeMeta[locale].flag} {locale}</span>
      <span className="tabular-nums tnum text-ink-3">{clock}</span>
    </footer>
  );
}
