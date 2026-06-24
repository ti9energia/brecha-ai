// ─────────────────────────────────────────────────────────────────────────────
// Store — repositórios em memória sobre o seed. Espelha o contrato que seria
// servido por Prisma/Postgres. Mutações persistem no processo (suficiente p/ demo).
// ─────────────────────────────────────────────────────────────────────────────
import {
  NORMS, OPPORTUNITIES, STRUCTURE, SCENARIOS, EXECUTION_PLANS, SAVINGS,
  AGENT_RECS, SECTORS, OWNER_KPIS, TENANTS, PLANS, FEATURE_FLAGS, AUDIT_LOG,
} from "./seed";
import type {
  Norm, Opportunity, ScenarioParams, ScenarioResult, Level, OpportunityType,
} from "./types";

const DAY = 1000 * 60 * 60 * 24;

export function daysUntil(iso: string, now = new Date()): number {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY);
}

export type WindowState = "fresh" | "open" | "closing" | "urgent" | "expired";
export function windowState(iso: string): WindowState {
  const d = daysUntil(iso);
  if (d < 0) return "expired";
  if (d <= 7) return "urgent";
  if (d <= 21) return "closing";
  if (d <= 60) return "open";
  return "fresh";
}

export interface OpportunityView extends Opportunity {
  norm: Norm;
  daysRemaining: number;
  windowState: WindowState;
}

function join(opp: Opportunity): OpportunityView {
  const norm = NORMS.find((n) => n.id === opp.normId)!;
  return { ...opp, norm, daysRemaining: daysUntil(opp.windowEnd), windowState: windowState(opp.windowEnd) };
}

export type OppSort = "gain" | "deadline" | "confidence";

export function listOpportunities(opts?: {
  sector?: string;
  type?: OpportunityType;
  sort?: OppSort;
  status?: "active" | "all";
}): OpportunityView[] {
  let rows = OPPORTUNITIES.map(join);
  if (opts?.status !== "all") {
    rows = rows.filter((o) => o.status !== "expired");
  }
  if (opts?.sector && opts.sector !== "all") rows = rows.filter((o) => o.sector === opts.sector);
  if (opts?.type) rows = rows.filter((o) => o.type === opts.type);

  const sort = opts?.sort ?? "gain";
  rows.sort((a, b) => {
    if (sort === "deadline") return a.daysRemaining - b.daysRemaining;
    if (sort === "confidence") return b.confidence - a.confidence;
    return b.estimatedGain - a.estimatedGain;
  });
  return rows;
}

export function getOpportunity(id: string): OpportunityView | null {
  const opp = OPPORTUNITIES.find((o) => o.id === id);
  return opp ? join(opp) : null;
}

export function opportunitiesSummary() {
  const active = OPPORTUNITIES.filter((o) => !["expired", "captured"].includes(o.status));
  const openGain = active.reduce((s, o) => s + o.estimatedGain, 0);
  const closingSoon = active.filter((o) => daysUntil(o.windowEnd) <= 21).length;
  return {
    openWindows: active.length,
    openGain,
    closingSoon,
    capturedYtd: SAVINGS.realizedYtd,
  };
}

export interface RadarItem extends Norm {
  daysSince: number;
}
export function listRadar(opts?: { level?: string; sector?: string }): RadarItem[] {
  let rows = [...NORMS];
  if (opts?.level && opts.level !== "all") rows = rows.filter((n) => n.level === opts.level);
  if (opts?.sector && opts.sector !== "all") rows = rows.filter((n) => n.sector === opts.sector);
  rows.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const now = new Date();
  return rows.map((n) => ({ ...n, daysSince: Math.max(0, Math.floor((now.getTime() - new Date(n.publishedAt).getTime()) / DAY)) }));
}

/** Norma → oportunidade já aberta (se houver). */
export function opportunityForNorm(normId: string): Opportunity | undefined {
  return OPPORTUNITIES.find((o) => o.normId === normId);
}

export function getStructure() {
  return STRUCTURE;
}

export function listScenarios() {
  return SCENARIOS;
}

// ── Motor fiscal determinístico (mock plausível) ─────────────────────────────
const REGIME_RATE: Record<string, number> = {
  "Lucro Real": 0.18,
  "Lucro Presumido": 0.155,
  "Simples Nacional": 0.095,
};
const JURISDICTION_DELTA: Record<string, number> = {
  SP: 0,
  SC: -0.018,
  MG: -0.006,
  "Área SUDENE": -0.028,
  "Área SUFRAMA": -0.034,
};
const CLASS_DELTA: Record<string, number> = {
  "Indústria metalúrgica": 0,
  "Tecnologia / software": -0.012,
  "Comércio atacadista": 0.004,
  "Energia": -0.009,
};

export function runScenario(params: ScenarioParams): ScenarioResult {
  const base = REGIME_RATE[params.regime] ?? 0.18;
  const jd = JURISDICTION_DELTA[params.jurisdiction] ?? 0;
  const cd = CLASS_DELTA[params.classification] ?? 0;
  const effectiveRate = Math.max(0.04, base + jd + cd);
  const annualBurden = Math.round(params.revenue * effectiveRate);

  const baseline = SCENARIOS.find((s) => s.isBaseline)!;
  const annualSaving = baseline.result.annualBurden - annualBurden;

  let riskLevel: Level = "low";
  if (jd <= -0.025 || params.regime === "Simples Nacional") riskLevel = "medium";
  if (jd <= -0.03) riskLevel = "high";

  const restructureCost = Math.abs(annualSaving) * 0.12 + 180_000;
  const paybackMonths = annualSaving > 0 ? Math.max(1, Math.round((restructureCost / annualSaving) * 12)) : 0;

  return { annualBurden, annualSaving, effectiveRate, riskLevel, paybackMonths };
}

export function listExecutionPlans() {
  return EXECUTION_PLANS.map((p) => ({ ...p, opportunity: getOpportunity(p.opportunityId) }));
}
export function getExecutionPlan(id: string) {
  const plan = EXECUTION_PLANS.find((p) => p.id === id || p.opportunityId === id);
  if (!plan) return null;
  return { ...plan, opportunity: getOpportunity(plan.opportunityId) };
}

/** Aprovação humana (tributarista) — muta o plano e a oportunidade. */
export function approveExecution(opportunityId: string, approver: string) {
  const opp = OPPORTUNITIES.find((o) => o.id === opportunityId);
  if (opp && opp.status === "pending_approval") opp.status = "approved";
  let plan = EXECUTION_PLANS.find((p) => p.opportunityId === opportunityId);
  if (!plan && opp) {
    plan = {
      id: `exec-${opportunityId}`,
      opportunityId,
      title: opp.title,
      approver,
      approved: true,
      approvedBy: approver,
      status: "approved",
      progress: 0,
      steps: opp.recommendedMove.requirements.map((r, i) => ({
        id: `s${i + 1}`,
        title: r,
        detail: "",
        status: i === 0 ? "doing" : "todo",
        assignee: "Time Fiscal",
        due: opp.windowEnd,
      })),
      audit: [
        { id: "a1", at: new Date().toISOString(), actor: `${approver} (Tributarista)`, action: "Execução aprovada", detail: opp.title },
      ],
    };
    EXECUTION_PLANS.push(plan);
  } else if (plan) {
    plan.approved = true;
    plan.approvedBy = approver;
    plan.status = "approved";
  }
  return getExecutionPlan(opportunityId);
}

export function getSavings() {
  return SAVINGS;
}

export function listAgentRecs() {
  return AGENT_RECS.map((r) => ({ ...r, opportunity: r.opportunityId ? getOpportunity(r.opportunityId) : null }));
}

export function getSectors() {
  return SECTORS;
}
export function getPlans() {
  return PLANS;
}

// ── Painel do Dono ───────────────────────────────────────────────────────────
export function ownerKpis() {
  return OWNER_KPIS;
}
export function listTenants() {
  return TENANTS;
}
export function listFlags() {
  return FEATURE_FLAGS;
}
export function ownerAudit() {
  return AUDIT_LOG;
}

// agrega tudo o que o copiloto / WhatsApp precisa "entender" o sistema
export function copilotContext() {
  return {
    structure: STRUCTURE,
    opportunities: listOpportunities({ sort: "gain", status: "all" }),
    savings: SAVINGS,
    agentRecs: AGENT_RECS,
  };
}
