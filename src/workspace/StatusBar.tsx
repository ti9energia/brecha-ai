"use client";

import { useEffect, useState } from "react";
import { Radar, Bot, ShieldCheck, Globe } from "lucide-react";
import { opportunitiesSummary, listAgentRecs } from "@/server/domain/store";
import { useLocale } from "@/i18n/provider";
import { localeMeta } from "@/i18n/config";

export function StatusBar() {
  const locale = useLocale();
  const summary = opportunitiesSummary();
  const recs = listAgentRecs().length;
  const [clock, setClock] = useState<string>("--:--:--");

  useEffect(() => {
    const tick = () =>
      setClock(new Intl.DateTimeFormat(localeMeta[locale].intl, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [locale]);

  return (
    <footer className="flex items-center gap-4 h-7 px-3 border-t border-line bg-[var(--canvas-deep)] mono text-[0.66rem] text-ink-4 shrink-0 overflow-hidden">
      <span className="flex items-center gap-1.5 text-positive">
        <span className="relative grid place-items-center">
          <Radar size={11} />
        </span>
        RADAR ATIVO
      </span>
      <span className="hidden sm:inline">1.247 fontes</span>
      <span className="hidden md:inline text-brand">{summary.openWindows} janelas abertas</span>
      <span className="hidden lg:flex items-center gap-1.5"><Bot size={11} /> {recs} recomendações</span>

      <span className="ml-auto hidden sm:flex items-center gap-1.5"><ShieldCheck size={11} className="text-positive" /> auditoria ativa</span>
      <span className="flex items-center gap-1.5"><Globe size={11} /> {localeMeta[locale].flag} {locale}</span>
      <span className="tabular-nums tnum text-ink-3">{clock}</span>
    </footer>
  );
}
