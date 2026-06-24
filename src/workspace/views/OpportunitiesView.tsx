"use client";

import { useMemo, useState } from "react";
import { Crosshair, SlidersHorizontal, TrendingUp, Timer, Coins, Sparkles } from "lucide-react";
import { listOpportunities, opportunitiesSummary, getSectors, type OppSort } from "@/server/domain/store";
import { useFormatter, useTranslations } from "@/i18n/provider";
import { OpportunityCard } from "@/components/OpportunityCard";
import { ViewScroll, ViewHeader, StatTiles, StatTile } from "./shared";
import { cn } from "@/ui/cn";

export function OpportunitiesView() {
  const t = useTranslations("opportunities");
  const tc = useTranslations("common");
  const tStates = useTranslations("states");
  const fmt = useFormatter();
  const [sort, setSort] = useState<OppSort>("gain");
  const [sector, setSector] = useState<string>("all");

  const sectors = getSectors();
  const summary = useMemo(() => opportunitiesSummary(), []);
  const rows = useMemo(() => listOpportunities({ sort, sector }), [sort, sector]);

  const sorts: { id: OppSort; label: string }[] = [
    { id: "gain", label: t("sortGain") },
    { id: "deadline", label: t("sortDeadline") },
    { id: "confidence", label: t("sortConfidence") },
  ];

  return (
    <ViewScroll>
      <ViewHeader
        icon={<Crosshair size={20} />}
        eyebrow={tc("updatedAt") + " · " + fmt.date(new Date(), { day: "2-digit", month: "long" })}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <StatTiles>
        <StatTile label={t("openWindows")} value={fmt.number(summary.openWindows)} accent="gold" hint={<span className="inline-flex items-center gap-1"><TrendingUp size={11} className="text-positive" />radar ativo</span>} />
        <StatTile label={t("potentialGain")} value={fmt.moneyCompact(summary.openGain)} accent="gold" hint={tc("estimated") + " · " + tc("perYear")} />
        <StatTile label={t("closingSoon")} value={fmt.number(summary.closingSoon)} accent="danger" hint={<span className="inline-flex items-center gap-1"><Timer size={11} />≤ 21 {tc("days")}</span>} />
        <StatTile label={t("captured")} value={fmt.moneyCompact(summary.capturedYtd)} accent="positive" hint={<span className="inline-flex items-center gap-1"><Coins size={11} />{tc("realized")}</span>} />
      </StatTiles>

      {/* barra de filtros/ordenação */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="inline-flex items-center gap-1 p-1 rounded-[var(--radius-md)] border border-line bg-surface-2">
          <SlidersHorizontal size={14} className="text-ink-4 ml-1.5 mr-0.5" />
          {sorts.map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={cn(
                "px-3 h-8 rounded-[var(--radius-sm)] text-sm transition-colors",
                sort === s.id ? "bg-surface-4 text-ink" : "text-ink-3 hover:text-ink",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <FilterChip active={sector === "all"} onClick={() => setSector("all")}>{t("filterAll")}</FilterChip>
          {sectors.map((s) => (
            <FilterChip key={s.id} active={sector === s.id} onClick={() => setSector(s.id)}>
              {s.label}
            </FilterChip>
          ))}
        </div>

        <span className="ml-auto mono text-xs text-ink-4">{fmt.number(rows.length)} {t("title").toLowerCase()}</span>
      </div>

      {rows.length === 0 ? (
        <div className="panel hairline">
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="mb-5 grid place-items-center size-16 rounded-full border border-line bg-surface-2 text-brand">
              <Sparkles size={22} />
            </div>
            <h3 className="text-lg font-semibold text-ink">{tStates("emptyOpportunities")}</h3>
            <p className="mt-2 max-w-sm text-sm text-ink-3">{tStates("emptyOpportunitiesHint")}</p>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((opp, i) => (
            <OpportunityCard key={opp.id} opp={opp} index={i} />
          ))}
        </div>
      )}
    </ViewScroll>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 h-8 px-3 rounded-full border text-sm transition-colors whitespace-nowrap",
        active ? "border-line-gold bg-[var(--brand-soft)] text-brand" : "border-line bg-surface-2 text-ink-3 hover:text-ink hover:border-line-strong",
      )}
    >
      {children}
    </button>
  );
}
