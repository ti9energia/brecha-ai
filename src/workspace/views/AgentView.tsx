"use client";

import { useState } from "react";
import { Bot, Timer, Sparkles, AlertTriangle, Wallet, ArrowRight, X, Radar, Play, Loader2 } from "lucide-react";
import { listAgentRecs } from "@/server/domain/store";
import type { AgentRecommendation } from "@/server/domain/types";
import { useFormatter, useTranslations } from "@/i18n/provider";
import { useWorkspace } from "@/workspace/store";
import { useToast } from "@/ui/Toast";
import { Meter, buttonClass } from "@/ui/primitives";
import { ViewScroll, ViewHeader, writeJson } from "./shared";

const KIND_ICON: Record<string, React.ReactNode> = {
  window_closing: <Timer size={16} />,
  new_opportunity: <Sparkles size={16} />,
  structure_gap: <AlertTriangle size={16} />,
  reconcile: <Wallet size={16} />,
};
const KIND_TONE: Record<string, "danger" | "gold" | "warning" | "info"> = {
  window_closing: "danger",
  new_opportunity: "gold",
  structure_gap: "warning",
  reconcile: "info",
};

export function AgentView() {
  const t = useTranslations("agent");
  const tc = useTranslations("common");
  const tr = useTranslations("radar");
  const ts = useTranslations("status");
  const fmt = useFormatter();
  const ws = useWorkspace();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  // Antes de rodar, a fila vem do seed (listAgentRecs). Após rodar, mostra o que o
  // Agente Autônomo de fato produziu sobre os dados ao vivo (/api/ai/agent/run).
  const [liveRecs, setLiveRecs] = useState<AgentRecommendation[] | null>(null);
  const [running, setRunning] = useState(false);

  const recs = (liveRecs ?? listAgentRecs()).filter((r) => !dismissed.has(r.id));

  async function runAgent() {
    setRunning(true);
    const res = await writeJson("/api/ai/agent/run", {}, "POST");
    setRunning(false);
    if (!res.ok || !Array.isArray(res.data)) {
      toast({ title: t("runError"), tone: "error" });
      return;
    }
    const next = res.data as AgentRecommendation[];
    setLiveRecs(next);
    setDismissed(new Set());
    toast({
      title: t("ranTitle"),
      description: next.length ? t("ranBody", { n: String(next.length) }) : t("ranEmpty"),
      tone: "success",
    });
  }

  function dismiss(id: string) {
    setDismissed((s) => new Set(s).add(id));
    toast({ title: t("dismissed"), tone: "info" });
  }

  return (
    <ViewScroll>
      <ViewHeader
        icon={<Bot size={20} />}
        title={t("title")}
        subtitle={t("monitoring", { n: fmt.number(1247) })}
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 chip" style={{ borderColor: "var(--border-gold)" }}>
              <span className="size-1.5 rounded-full bg-positive animate-[pulse-ring_2.4s_ease-out_infinite]" />
              <span className="text-positive">{ts("online")}</span>
            </span>
            <button onClick={runAgent} disabled={running} className={buttonClass("primary", "sm", "group")}>
              {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {running ? t("running") : t("run")}
            </button>
          </div>
        }
      />

      <div className="space-y-4">
        {recs.map((rec) => {
          const tone = KIND_TONE[rec.kind];
          return (
            <div key={rec.id} className="panel hairline gold-edge p-5">
              <div className="flex items-start gap-4">
                <span className={`grid place-items-center size-10 rounded-[var(--radius-md)] border shrink-0 ${
                  tone === "danger" ? "border-[color:var(--danger)]/30 bg-[var(--danger-soft)] text-danger" :
                  tone === "gold" ? "border-line-gold bg-[var(--brand-soft)] text-brand" :
                  tone === "warning" ? "border-[color:var(--warning)]/30 bg-[var(--warning-soft)] text-warning" :
                  "border-[color:var(--info)]/30 bg-[var(--info-soft)] text-info"
                }`}>
                  {KIND_ICON[rec.kind]}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display font-semibold text-ink text-balance">{rec.title}</h3>
                    <button onClick={() => dismiss(rec.id)} className="text-ink-4 hover:text-ink transition-colors shrink-0" aria-label={t("dismiss")}>
                      <X size={15} />
                    </button>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-3 text-pretty">{rec.body}</p>

                  <div className="mt-4 grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                    <div>
                      <p className="eyebrow mb-1">{t("impact")}</p>
                      <p className="font-display font-semibold text-brand tnum text-lg leading-none">{fmt.moneyCompact(rec.impact)}<span className="text-ink-4 text-xs ml-1">{tc("perYear")}</span></p>
                    </div>
                    <div>
                      <p className="eyebrow mb-1.5">{t("confidence")}</p>
                      <div className="flex items-center gap-2">
                        <Meter value={rec.confidence} tone="positive" className="flex-1" />
                        <span className="mono text-xs text-ink-2">{fmt.percent(rec.confidence)}</span>
                      </div>
                    </div>
                    {rec.opportunityId && (
                      <button onClick={() => ws.open("opportunity", { id: rec.opportunityId! })} className={buttonClass("primary", "sm", "group")}>
                        {rec.kind === "window_closing" ? t("prepare") : tc("viewDetail")}
                        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {recs.length === 0 && (
          <div className="panel hairline py-16 grid place-items-center text-center">
            <span className="grid place-items-center size-14 rounded-full border border-line bg-surface-2 text-brand mb-4"><Radar size={22} /></span>
            <p className="text-ink-2">{tr("feedEmpty")}</p>
            <button onClick={runAgent} disabled={running} className={buttonClass("primary", "sm", "mt-5")}>
              {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {running ? t("running") : t("run")}
            </button>
          </div>
        )}
      </div>
    </ViewScroll>
  );
}
