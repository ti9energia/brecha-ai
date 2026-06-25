"use client";

import { useState } from "react";
import {
  ArrowLeft, ExternalLink, FileText, FlaskConical, ShieldCheck, ArrowRight,
  TrendingDown, AlertTriangle, Check, Sparkles, ChevronRight, Scale,
} from "lucide-react";
import { getOpportunity, approveExecution } from "@/server/domain/store";
import { useFormatter, useTranslations } from "@/i18n/provider";
import { useWorkspace } from "@/workspace/store";
import { useSession } from "@/workspace/session";
import { useToast } from "@/ui/Toast";
import { ApertureRing } from "@/ui/ApertureRing";
import { Chip, Meter, buttonClass } from "@/ui/primitives";
import { SectorIcon } from "@/ui/SectorIcon";
import { ViewScroll } from "./shared";
import { cn } from "@/ui/cn";

export function OpportunityDetailView({ params }: { params?: Record<string, string> }) {
  const t = useTranslations("detail");
  const tc = useTranslations("common");
  const tt = useTranslations("oppTypes");
  const ts = useTranslations("oppStatus");
  const tr = useTranslations("radar");
  const fmt = useFormatter();
  const ws = useWorkspace();
  const user = useSession();
  const { toast } = useToast();
  const opp = params?.id ? getOpportunity(params.id) : null;
  const [approved, setApproved] = useState(opp?.status === "approved" || opp?.status === "executing");

  if (!opp) {
    return (
      <ViewScroll>
        <div className="panel hairline p-10 text-center">
          <p className="text-ink-3">{t("backToList")} — {tc("retry")}</p>
        </div>
      </ViewScroll>
    );
  }

  const sim = opp.simulation;
  const maxBurden = Math.max(sim.annualBurdenBefore, sim.annualBurdenAfter, 1);
  const ringValue = Math.min(1, Math.max(0.05, opp.daysRemaining / 120));

  function approve() {
    approveExecution(opp!.id, user.name);
    setApproved(true);
    toast({
      title: t("approvedTitle"),
      description: `${opp!.title} · ${fmt.moneyCompact(opp!.estimatedGain)}${tc("perYear")}`,
      tone: "success",
    });
    ws.open("execution", { focus: opp!.id });
  }

  return (
    <ViewScroll>
      {/* breadcrumb */}
      <button
        onClick={() => ws.open("opportunities")}
        className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors mb-5"
      >
        <ArrowLeft size={15} /> {t("backToList")}
      </button>

      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-6 mb-7">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Chip tone="neutral"><SectorIcon name={opp.sector} size={13} />{tt(opp.type)}</Chip>
            <Chip tone={opp.status === "open" ? "gold" : opp.status === "pending_approval" ? "warning" : "info"}>{ts(opp.status)}</Chip>
            <Chip tone="neutral">{tr(opp.norm.level)} · {opp.norm.jurisdiction}</Chip>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-[1.9rem] leading-tight text-ink text-balance max-w-2xl">{opp.title}</h1>
          <p className="mt-3 text-ink-2 text-pretty max-w-2xl">{opp.summary}</p>
        </div>

        <div className="flex flex-col items-center gap-2 shrink-0">
          <ApertureRing
            value={ringValue}
            size={130}
            stroke={7}
            center={
              <span className="block">
                <span className="block text-3xl font-bold text-ink tnum leading-none">{opp.daysRemaining}</span>
              </span>
            }
            label={tc("days")}
          />
          <p className="mono text-[0.68rem] text-ink-4">{t("effectiveFrom")}: {fmt.date(opp.norm.effectiveDate)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.55fr_1fr] gap-5">
        {/* coluna principal */}
        <div className="space-y-5">
          {/* norma-gatilho */}
          <div className="panel hairline p-6">
            <SectionTitle icon={<FileText size={16} />} title={t("triggerNorm")} subtitle={t("triggerNormSub")} />
            <div className="mt-4 rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="mono text-xs text-brand">{opp.norm.source.ref}</p>
                <a href={opp.norm.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mono text-[0.7rem] text-ink-4 hover:text-brand transition-colors shrink-0">
                  {t("readSource")} <ExternalLink size={11} />
                </a>
              </div>
              <h3 className="mt-2 font-display font-semibold text-ink">{opp.norm.title}</h3>
              <p className="mt-2 text-sm text-ink-3 text-pretty leading-relaxed">{opp.norm.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {opp.norm.tags.map((tag) => (
                  <span key={tag} className="chip text-[0.68rem]">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* simulação de impacto */}
          <div className="panel hairline p-6">
            <SectionTitle icon={<FlaskConical size={16} />} title={t("impactSim")} subtitle={t("impactSimSub")} />
            <div className="mt-5 space-y-4">
              <BurdenBar label={t("before")} value={sim.annualBurdenBefore} max={maxBurden} rate={sim.effectiveRateBefore} fmt={fmt} tone="neutral" />
              <BurdenBar label={t("after")} value={sim.annualBurdenAfter} max={maxBurden} rate={sim.effectiveRateAfter} fmt={fmt} tone="gold" />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-px bg-[color:var(--border)] rounded-[var(--radius-md)] overflow-hidden border border-line">
              <MiniStat icon={<TrendingDown size={14} />} label={t("annualGain")} value={fmt.moneyCompact(sim.annualGain)} accent="positive" />
              <MiniStat icon={<Scale size={14} />} label={t("taxBurden")} value={fmt.percent(sim.effectiveRateAfter)} sub={`${fmt.percent(sim.effectiveRateBefore)} →`} />
              <MiniStat icon={<AlertTriangle size={14} />} label={t("riskScore")} value={`${sim.riskAfter}/100`} sub={`${sim.riskBefore} →`} accent={sim.riskAfter <= 25 ? "positive" : "warning"} />
            </div>

            <div className="mt-4 rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
              <p className="eyebrow mb-2">{tc("estimated")} · {t("assumptions")}</p>
              <ul className="space-y-1.5">
                {sim.assumptions.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-sm text-ink-3">
                    <ChevronRight size={13} className="text-ink-4 mt-1 shrink-0" /> {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* jogada recomendada */}
          <div className="panel hairline p-6">
            <SectionTitle icon={<Sparkles size={16} />} title={t("recommendedMove")} subtitle={t("recommendedMoveSub")} />
            <p className="mt-4 font-display font-semibold text-lg text-ink text-balance">{opp.recommendedMove.headline}</p>

            <div className="mt-5 grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
                <p className="eyebrow mb-2 text-ink-4">{t("before")}</p>
                <p className="text-sm text-ink-2">{opp.recommendedMove.fromState}</p>
              </div>
              <div className="grid place-items-center size-9 rounded-full bg-brand text-on-brand mx-auto rotate-90 sm:rotate-0">
                <ArrowRight size={16} />
              </div>
              <div className="rounded-[var(--radius-md)] border border-line-gold bg-[var(--brand-soft)] p-4">
                <p className="eyebrow mb-2 text-brand">{t("after")}</p>
                <p className="text-sm text-ink">{opp.recommendedMove.toState}</p>
              </div>
            </div>

            <div className="mt-5">
              <p className="eyebrow mb-2.5">{t("rationale")}</p>
              <ul className="space-y-2">
                {opp.recommendedMove.rationale.map((r) => (
                  <li key={r} className="flex items-start gap-2.5 text-sm text-ink-2">
                    <span className="grid place-items-center size-5 rounded-full bg-[var(--positive-soft)] text-positive shrink-0 mt-0.5"><Check size={12} /></span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* sidebar */}
        <div className="space-y-5">
          <div className="panel hairline p-6 lg:sticky lg:top-3">
            <p className="eyebrow mb-2">{t("annualGain")}</p>
            <p className="font-display font-bold text-4xl text-brand tnum leading-none">
              {fmt.moneyCompact(opp.estimatedGain)}
            </p>
            <p className="mono text-xs text-ink-4 mt-1">{tc("estimated")} {tc("perYear")}</p>

            <div className="mt-5 space-y-3">
              <LabeledMeter label={tc("confidence")} value={opp.confidence} tone="positive" hint={fmt.percent(opp.confidence)} />
              <LabeledMeter label={tc("effort")} value={{ low: 0.33, medium: 0.66, high: 1 }[opp.effort]} tone={opp.effort === "high" ? "warning" : "gold"} hint={tc(opp.effort)} />
            </div>

            <p className="mt-5 text-xs text-ink-4 text-pretty">{t("confidenceExplain", { n: String(opp.correlatedNorms) })}</p>

            <div className="mt-6 space-y-2.5">
              <button onClick={() => ws.open("simulator", { from: opp.id })} className={buttonClass("secondary", "md", "w-full")}>
                <FlaskConical size={15} className="text-brand" /> {t("simulateVariations")}
              </button>
              {approved ? (
                <div className="flex items-center justify-center gap-2 h-10 rounded-[var(--radius-md)] border border-[color:var(--positive)]/30 bg-[var(--positive-soft)] text-positive text-sm font-medium">
                  <ShieldCheck size={15} /> {ts("approved")}
                </div>
              ) : (
                <button onClick={approve} className={buttonClass("primary", "md", "w-full group")}>
                  <ShieldCheck size={15} /> {t("approveExecution")}
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
              <p className="text-center mono text-[0.66rem] text-ink-4 flex items-center justify-center gap-1">
                <ShieldCheck size={11} /> {t("needsApproval")}
              </p>
            </div>
          </div>

          {/* pré-requisitos */}
          <div className="panel hairline p-6">
            <p className="eyebrow mb-3">{t("requirements")}</p>
            <ul className="space-y-2.5">
              {opp.recommendedMove.requirements.map((req, i) => (
                <li key={req} className="flex items-start gap-2.5 text-sm text-ink-2">
                  <span className="grid place-items-center size-5 rounded-full border border-line bg-surface-2 text-ink-4 mono text-[0.65rem] shrink-0 mt-0.5">{i + 1}</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </ViewScroll>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid place-items-center size-8 rounded-[var(--radius-sm)] border border-line bg-surface-2 text-brand shrink-0">{icon}</span>
      <div>
        <h2 className="font-display font-semibold text-ink">{title}</h2>
        {subtitle && <p className="text-xs text-ink-4 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function BurdenBar({ label, value, max, rate, fmt, tone }: { label: string; value: number; max: number; rate: number; fmt: ReturnType<typeof useFormatter>; tone: "neutral" | "gold" }) {
  const pct = Math.max(2, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-ink-2">{label}</span>
        <span className="mono text-sm text-ink tnum">{fmt.money(value)} <span className="text-ink-4">· {fmt.percent(rate)}</span></span>
      </div>
      <div className="h-7 rounded-[var(--radius-sm)] bg-surface-2 overflow-hidden border border-line">
        <div
          className={cn("h-full rounded-[var(--radius-sm)] transition-all duration-700 ease-[var(--ease-out-expo)]")}
          style={{
            width: `${pct}%`,
            background: tone === "gold"
              ? "linear-gradient(90deg, var(--brand-deep), var(--brand-bright))"
              : "linear-gradient(90deg, var(--surface-4), var(--ink-4))",
          }}
        />
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: "positive" | "warning" }) {
  const color = accent === "positive" ? "text-positive" : accent === "warning" ? "text-warning" : "text-ink";
  return (
    <div className="bg-surface p-4">
      <span className="inline-flex items-center gap-1.5 eyebrow mb-2 text-ink-4">{icon}{label}</span>
      <p className={cn("font-display font-semibold text-lg tnum leading-none", color)}>
        {sub && <span className="text-ink-4 text-xs font-normal mr-1">{sub}</span>}
        {value}
      </p>
    </div>
  );
}

function LabeledMeter({ label, value, tone, hint }: { label: string; value: number; tone: "positive" | "gold" | "warning"; hint: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-ink-3">{label}</span>
        <span className="mono text-xs text-ink-2">{hint}</span>
      </div>
      <Meter value={value} tone={tone} />
    </div>
  );
}
