"use client";

import { useMemo, useState } from "react";
import { FlaskConical, Play, Loader2, ArrowRight, Save, Crosshair, TrendingDown, Scale, ShieldAlert, Clock } from "lucide-react";
import { runScenario, listScenarios, getOpportunity } from "@/server/domain/store";
import type { ScenarioParams, ScenarioResult, Level } from "@/server/domain/types";
import { useFormatter, useTranslations } from "@/i18n/provider";
import { useWorkspace } from "@/workspace/store";
import { useToast } from "@/ui/Toast";
import { Chip, buttonClass } from "@/ui/primitives";
import { ViewScroll, ViewHeader, Section } from "./shared";
import { cn } from "@/ui/cn";

const REGIMES = ["Lucro Real", "Lucro Presumido", "Simples Nacional"];
const JURISDICTIONS = ["SP", "SC", "MG", "Área SUDENE", "Área SUFRAMA"];
const CLASSES = ["Indústria metalúrgica", "Tecnologia / software", "Comércio atacadista", "Energia"];

const RISK_TONE: Record<Level, "positive" | "warning" | "danger"> = { low: "positive", medium: "warning", high: "danger" };

export function SimulatorView({ params }: { params?: Record<string, string> }) {
  const t = useTranslations("simulator");
  const tc = useTranslations("common");
  const fmt = useFormatter();
  const ws = useWorkspace();
  const { toast } = useToast();

  const baseline = useMemo(() => listScenarios().find((s) => s.isBaseline)!, []);
  const fromOpp = params?.from ? getOpportunity(params.from) : null;

  const [form, setForm] = useState<ScenarioParams>({
    regime: "Lucro Real",
    jurisdiction: fromOpp?.type === "jurisdiction" ? "Área SUDENE" : "SP",
    classification: "Indústria metalúrgica",
    revenue: 480_000_000,
  });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);

  function run() {
    setRunning(true);
    setResult(null);
    setTimeout(() => {
      setResult(runScenario(form));
      setRunning(false);
    }, 560);
  }

  const maxBurden = Math.max(baseline.result.annualBurden, result?.annualBurden ?? 0, 1);

  return (
    <ViewScroll>
      <ViewHeader
        icon={<FlaskConical size={20} />}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={fromOpp ? <Chip tone="gold"><Crosshair size={12} />{fromOpp.title}</Chip> : undefined}
      />

      <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-5">
        {/* parâmetros */}
        <div className="panel hairline p-6 lg:sticky lg:top-3 self-start">
          <p className="eyebrow mb-4">{t("parameters")}</p>
          <div className="space-y-4">
            <SelectField label={t("paramRegime")} value={form.regime} options={REGIMES} onChange={(v) => setForm((f) => ({ ...f, regime: v }))} />
            <SelectField label={t("paramJurisdiction")} value={form.jurisdiction} options={JURISDICTIONS} onChange={(v) => setForm((f) => ({ ...f, jurisdiction: v }))} />
            <SelectField label={t("paramClassification")} value={form.classification} options={CLASSES} onChange={(v) => setForm((f) => ({ ...f, classification: v }))} />
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">{t("paramRevenue")}</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-ink-4 mono text-sm">R$</span>
                <input
                  type="number"
                  className="input"
                  style={{ paddingLeft: "2.5rem" }}
                  value={form.revenue}
                  step={10_000_000}
                  min={0}
                  onChange={(e) => setForm((f) => ({ ...f, revenue: Number(e.target.value) }))}
                />
              </div>
              <p className="mono text-[0.68rem] text-ink-4 mt-1.5">{fmt.money(form.revenue)}</p>
            </div>
          </div>

          <button onClick={run} disabled={running} className={buttonClass("primary", "lg", "w-full mt-6 group")}>
            {running ? <><Loader2 size={16} className="animate-spin" />{t("running")}</> : <><Play size={15} />{t("run")}</>}
          </button>
        </div>

        {/* resultado */}
        <div className="space-y-5">
          <Section title={t("compare")}>
            <div className="panel hairline p-6 space-y-5">
              <ScenarioBar label={t("baseline")} value={baseline.result.annualBurden} max={maxBurden} fmt={fmt} tone="neutral" />
              {result ? (
                <ScenarioBar label={t("newScenario")} value={result.annualBurden} max={maxBurden} fmt={fmt} tone="gold" />
              ) : (
                <div className="h-7 rounded-[var(--radius-sm)] border border-dashed border-line grid place-items-center">
                  <span className="mono text-xs text-ink-4">{running ? t("running") : t("run")}</span>
                </div>
              )}
            </div>
          </Section>

          {result && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[color:var(--border)] rounded-[var(--radius-lg)] overflow-hidden border border-line animate-rise">
                <ResultTile icon={<TrendingDown size={14} />} label={t("annualSaving")} value={fmt.moneyCompact(result.annualSaving)} accent={result.annualSaving > 0 ? "positive" : "danger"} sub={t("vsBaseline")} />
                <ResultTile icon={<Scale size={14} />} label={t("annualBurden")} value={fmt.percent(result.effectiveRate)} sub={fmt.moneyCompact(result.annualBurden)} />
                <ResultTile icon={<ShieldAlert size={14} />} label={t("riskLevel")} value={<Chip tone={RISK_TONE[result.riskLevel]}>{tc(result.riskLevel)}</Chip>} />
                <ResultTile icon={<Clock size={14} />} label={t("breakeven")} value={`${result.paybackMonths} ${tc("months")}`} />
              </div>

              <div className="flex flex-wrap gap-2.5 animate-rise">
                <button
                  onClick={() => toast({ title: t("saveScenario"), description: `${form.regime} · ${form.jurisdiction} · ${fmt.moneyCompact(result.annualSaving)}${tc("perYear")}`, tone: "success" })}
                  className={buttonClass("secondary", "md")}
                >
                  <Save size={15} />{t("saveScenario")}
                </button>
                <button onClick={() => ws.open("opportunities")} className={buttonClass("primary", "md", "group")}>
                  {t("turnIntoOpportunity")}
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ViewScroll>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-2 mb-1.5">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function ScenarioBar({ label, value, max, fmt, tone }: { label: string; value: number; max: number; fmt: ReturnType<typeof useFormatter>; tone: "neutral" | "gold" }) {
  const pct = Math.max(3, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-ink-2">{label}</span>
        <span className="mono text-sm text-ink tnum">{fmt.money(value)}</span>
      </div>
      <div className="h-7 rounded-[var(--radius-sm)] bg-surface-2 overflow-hidden border border-line">
        <div
          className="h-full rounded-[var(--radius-sm)] transition-all duration-700 ease-[var(--ease-out-expo)]"
          style={{ width: `${pct}%`, background: tone === "gold" ? "linear-gradient(90deg, var(--brand-deep), var(--brand-bright))" : "linear-gradient(90deg, var(--surface-4), var(--ink-4))" }}
        />
      </div>
    </div>
  );
}

function ResultTile({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; accent?: "positive" | "danger" }) {
  const color = accent === "positive" ? "text-positive" : accent === "danger" ? "text-danger" : "text-ink";
  return (
    <div className="bg-surface p-4">
      <span className="inline-flex items-center gap-1.5 eyebrow mb-2 text-ink-4">{icon}{label}</span>
      <p className={cn("font-display font-semibold text-lg tnum leading-none", color)}>{value}</p>
      {sub && <p className="mono text-[0.66rem] text-ink-4 mt-1">{sub}</p>}
    </div>
  );
}
