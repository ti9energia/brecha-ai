"use client";

import { useMemo, useState } from "react";
import {
  ListChecks, CheckCircle2, Circle, Loader2, AlertCircle, FileText,
  ShieldCheck, ChevronDown, User, CalendarClock,
} from "lucide-react";
import { listExecutionPlans, approveExecution, listOpportunities } from "@/server/domain/store";
import type { ExecutionStep, AuditEntry, StepStatus } from "@/server/domain/types";
import { useFormatter, useTranslations } from "@/i18n/provider";
import { Button, Chip, Meter } from "@/ui/primitives";
import { ViewScroll, ViewHeader } from "./shared";
import { cn } from "@/ui/cn";

const APPROVER = "Helena Vasconcelos — Tributarista";
const APPROVER_SHORT = "Helena Vasconcelos";

// chip tone por status da jogada (reaproveita rótulos de oppStatus)
const STATUS_TONE: Record<string, "gold" | "positive" | "warning" | "info" | "neutral"> = {
  open: "gold",
  simulating: "info",
  pending_approval: "warning",
  approved: "info",
  executing: "gold",
  captured: "positive",
  expired: "neutral",
};

export function ExecutionView({ params }: { params?: Record<string, string> }) {
  const t = useTranslations("execution");
  const tc = useTranslations("common");
  const ts = useTranslations("oppStatus");
  const fmt = useFormatter();
  const focus = params?.focus;

  // bump para forçar releitura do store em memória após mutação
  const [tick, setTick] = useState(0);

  const pending = useMemo(
    () => listOpportunities({ status: "all" }).filter((o) => o.status === "pending_approval"),
    [tick],
  );
  const plans = useMemo(() => listExecutionPlans(), [tick]);

  function refresh() {
    setTick((n) => n + 1);
  }

  function approve(opportunityId: string) {
    approveExecution(opportunityId, APPROVER_SHORT);
    refresh();
  }

  const isEmpty = pending.length === 0 && plans.length === 0;

  return (
    <ViewScroll>
      <ViewHeader
        icon={<ListChecks size={20} />}
        eyebrow={tc("updatedAt") + " · " + fmt.date(new Date(), { day: "2-digit", month: "long" })}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      {isEmpty ? (
        <div className="panel hairline">
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="mb-5 grid place-items-center size-16 rounded-full border border-line bg-surface-2 text-brand">
              <ListChecks size={22} />
            </div>
            <h3 className="text-lg font-semibold text-ink">{t("emptyTitle")}</h3>
            <p className="mt-2 max-w-sm text-sm text-ink-3 text-pretty">{t("emptyHint")}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Aguardando aprovação ─────────────────────────────────────── */}
          {pending.map((opp) => (
            <div
              key={opp.id}
              className={cn(
                "panel border-line-gold p-6",
                focus === opp.id && "ring-1 ring-[color:var(--border-gold)]",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-2 eyebrow text-brand">
                    <ShieldCheck size={13} /> {t("awaitingApproval")}
                  </span>
                  <h2 className="mt-2.5 font-display font-semibold text-lg text-ink text-balance">{opp.title}</h2>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-3">
                    <User size={13} className="text-ink-4" />
                    {t("approver")}: <span className="text-ink-2">{APPROVER}</span>
                  </p>
                </div>
                <div className="shrink-0">
                  <Button variant="primary" onClick={() => approve(opp.id)}>
                    <ShieldCheck size={15} /> {t("approveAndStart")}
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* ── Planos ativos ────────────────────────────────────────────── */}
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              focused={focus === plan.opportunityId || focus === plan.id}
              onApprove={() => approve(plan.opportunityId)}
              t={t}
              ts={ts}
              fmt={fmt}
            />
          ))}
        </div>
      )}
    </ViewScroll>
  );
}

// ── Card de plano de execução ────────────────────────────────────────────────
type Plan = ReturnType<typeof listExecutionPlans>[number];

function PlanCard({
  plan,
  focused,
  onApprove,
  t,
  ts,
  fmt,
}: {
  plan: Plan;
  focused: boolean;
  onApprove: () => void;
  t: ReturnType<typeof useTranslations>;
  ts: ReturnType<typeof useTranslations>;
  fmt: ReturnType<typeof useFormatter>;
}) {
  const [auditOpen, setAuditOpen] = useState(false);

  return (
    <div
      className={cn(
        "panel hairline p-6",
        focused && "border-line-gold ring-1 ring-[color:var(--border-gold)]",
      )}
    >
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display font-semibold text-lg text-ink text-balance">{plan.title}</h2>
            <Chip tone={STATUS_TONE[plan.status] ?? "neutral"}>{ts(plan.status)}</Chip>
          </div>
          <div className="mt-2.5">
            {plan.approved ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-positive">
                <CheckCircle2 size={14} />
                {t("approvedBy", { name: plan.approvedBy ?? "" })}
              </span>
            ) : (
              <Button variant="primary" size="sm" onClick={onApprove}>
                <ShieldCheck size={14} /> {t("approveAndStart")}
              </Button>
            )}
          </div>
        </div>

        {/* progresso */}
        <div className="w-full sm:w-56 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="eyebrow">{t("progress")}</span>
            <span className="mono text-sm text-brand tabular-nums">{fmt.percent(plan.progress)}</span>
          </div>
          <Meter value={plan.progress} tone="gold" />
        </div>
      </div>

      {/* passos */}
      <div className="mt-6">
        <p className="eyebrow mb-3">{t("steps")}</p>
        <ol className="relative ml-1 border-l border-line">
          {plan.steps.map((step) => (
            <StepRow key={step.id} step={step} t={t} fmt={fmt} />
          ))}
        </ol>
      </div>

      {/* trilha de auditoria */}
      <div className="mt-6 rounded-[var(--radius-md)] border border-line bg-surface-2 overflow-hidden">
        <button
          onClick={() => setAuditOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 px-4 h-11 text-left transition-colors hover:bg-surface-3"
          aria-expanded={auditOpen}
        >
          <span className="inline-flex items-center gap-2 eyebrow text-ink-3">
            <ShieldCheck size={13} className="text-ink-4" />
            {t("auditTrail")}
            <span className="mono text-[0.7rem] text-ink-4">· {plan.audit.length}</span>
          </span>
          <ChevronDown
            size={15}
            className={cn("text-ink-4 transition-transform duration-200", auditOpen && "rotate-180")}
          />
        </button>
        {auditOpen && (
          <ul className="border-t border-line divide-y divide-[color:var(--border)] font-mono text-xs">
            {plan.audit.map((entry) => (
              <AuditRow key={entry.id} entry={entry} fmt={fmt} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Linha de passo (checklist) ───────────────────────────────────────────────
function StepRow({
  step,
  t,
  fmt,
}: {
  step: ExecutionStep;
  t: ReturnType<typeof useTranslations>;
  fmt: ReturnType<typeof useFormatter>;
}) {
  const done = step.status === "done";
  return (
    <li className="relative pl-7 pb-5 last:pb-0">
      {/* ícone de status sobre a hairline vertical */}
      <span className="absolute -left-[9px] top-0 grid place-items-center size-[18px] rounded-full bg-surface">
        <StepIcon status={step.status} />
      </span>

      <p className={cn("text-sm font-medium leading-snug", done ? "text-ink-4 line-through" : "text-ink")}>
        {step.title}
      </p>
      {step.detail && <p className="mt-1 text-sm text-ink-4 text-pretty">{step.detail}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 mono text-[0.72rem] text-ink-4">
        <span className="inline-flex items-center gap-1">
          <User size={12} /> {t("assignee")}: <span className="text-ink-3">{step.assignee}</span>
        </span>
        <span className="text-ink-4">·</span>
        <span className="inline-flex items-center gap-1">
          <CalendarClock size={12} /> {t("due")}:{" "}
          <span className="text-ink-3 tabular-nums">{fmt.date(step.due)}</span>
        </span>
        {step.document && (
          <span className="chip text-[0.68rem] text-ink-2 border-line bg-surface-2 ml-0.5">
            <FileText size={11} className="text-brand" /> {step.document}
          </span>
        )}
      </div>
    </li>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "done":
      return <CheckCircle2 size={16} className="text-positive" />;
    case "doing":
      return <Loader2 size={16} className="text-info animate-spin" />;
    case "blocked":
      return <AlertCircle size={16} className="text-danger" />;
    default:
      return <Circle size={16} className="text-ink-4" />;
  }
}

// ── Linha de auditoria (estilo log de terminal) ──────────────────────────────
function AuditRow({ entry, fmt }: { entry: AuditEntry; fmt: ReturnType<typeof useFormatter> }) {
  return (
    <li className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-baseline gap-x-3 gap-y-1">
      <time className="shrink-0 text-ink-4 tabular-nums whitespace-nowrap">
        {fmt.date(entry.at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
      </time>
      <span className="shrink-0 text-brand whitespace-nowrap">{entry.actor}</span>
      <span className="min-w-0">
        <span className="text-ink">{entry.action}</span>
        <span className="text-ink-3"> — {entry.detail}</span>
      </span>
    </li>
  );
}
