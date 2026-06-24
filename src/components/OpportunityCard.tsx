"use client";

import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import type { OpportunityView } from "@/server/domain/store";
import { useFormatter, useTranslations, useLocale } from "@/i18n/provider";
import { useWorkspaceOptional } from "@/workspace/store";
import { ApertureRing } from "@/ui/ApertureRing";
import { Chip, Meter } from "@/ui/primitives";
import { SectorIcon } from "@/ui/SectorIcon";
import { cn } from "@/ui/cn";

const STATUS_TONE = {
  open: "gold", simulating: "info", pending_approval: "warning",
  approved: "positive", executing: "info", captured: "positive", expired: "neutral",
} as const;

const EFFORT_VALUE = { low: 0.33, medium: 0.66, high: 1 };

export function windowTone(state: string): "gold" | "warning" | "danger" {
  if (state === "urgent") return "danger";
  if (state === "closing") return "warning";
  return "gold";
}

export function OpportunityCard({ opp, index = 0 }: { opp: OpportunityView; index?: number }) {
  const fmt = useFormatter();
  const t = useTranslations("opportunities");
  const tt = useTranslations("oppTypes");
  const ts = useTranslations("oppStatus");
  const tc = useTranslations("common");
  const locale = useLocale();
  const ws = useWorkspaceOptional();

  const maxWindow = 120;
  const ringValue = Math.min(1, Math.max(0.05, opp.daysRemaining / maxWindow));
  const tone = windowTone(opp.windowState);

  const inner = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Chip tone="neutral">
              <SectorIcon name={opp.sector} size={13} />
              {tt(opp.type)}
            </Chip>
            <Chip tone={STATUS_TONE[opp.status]}>{ts(opp.status)}</Chip>
          </div>
          <h3 className="font-display font-semibold text-[1.05rem] leading-snug text-ink text-balance group-hover:text-brand transition-colors">
            {opp.title}
          </h3>
          <p className="mt-2 text-sm text-ink-3 line-clamp-2 text-pretty">{opp.summary}</p>
        </div>

        <ApertureRing
          value={ringValue}
          size={72}
          stroke={5}
          center={<span className="text-base font-bold text-ink tnum">{opp.daysRemaining}</span>}
        />
      </div>

      <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-4 pt-4 border-t border-line">
        <div>
          <p className="eyebrow mb-1.5">{t("colGain")}</p>
          <p className="font-display font-semibold text-brand tnum text-lg leading-none">
            {fmt.moneyCompact(opp.estimatedGain)}
            <span className="text-ink-4 text-xs font-normal ml-1">{tc("perYear")}</span>
          </p>
        </div>
        <div>
          <p className="eyebrow mb-1.5">{tc("effort")}</p>
          <Meter value={EFFORT_VALUE[opp.effort]} tone={opp.effort === "high" ? "warning" : "neutral"} className="mt-2" />
        </div>
        <div>
          <p className="eyebrow mb-1.5">{tc("confidence")}</p>
          <Meter value={opp.confidence} tone="positive" className="mt-2" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="inline-flex items-center gap-1.5 mono text-[0.68rem] text-ink-4 min-w-0">
          <FileText size={12} className="shrink-0" />
          <span className="truncate">{opp.norm.source.ref}</span>
        </span>
        <span className={cn("inline-flex items-center gap-1 mono text-[0.68rem]",
          tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink-3")}>
          {opp.windowState === "urgent" || opp.windowState === "closing"
            ? `${t("windowClosesIn")} ${opp.daysRemaining}${tc("days").charAt(0)}`
            : <>{tc("viewDetail")} <ArrowUpRight size={12} /></>}
        </span>
      </div>
    </>
  );

  const cardClass =
    "group panel hairline gold-edge p-5 flex flex-col gap-4 hover:-translate-y-0.5 transition-transform duration-300 text-left w-full";

  if (ws) {
    return (
      <button className={cardClass} onClick={() => ws.open("opportunity", { id: opp.id }, opp.title)}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={`/${locale}/login`} className={cardClass}>
      {inner}
    </Link>
  );
}
