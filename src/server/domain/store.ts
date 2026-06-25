// ─────────────────────────────────────────────────────────────────────────────
// Store — repositórios em memória sobre o seed. Espelha o contrato que seria
// servido por Prisma/Postgres. Mutações persistem no processo (suficiente p/ demo).
// ─────────────────────────────────────────────────────────────────────────────
import {
  NORMS, OPPORTUNITIES, STRUCTURE, SCENARIOS, EXECUTION_PLANS, SAVINGS,
  AGENT_RECS, SECTORS, OWNER_KPIS, TENANTS, PLANS, FEATURE_FLAGS, AUDIT_LOG,
} from "./seed";
import type {
  Norm, Opportunity, ScenarioParams, ScenarioResult, Level, OpportunityType, ClientStructure,
} from "./types";

const DAY = 1000 * 60 * 60 * 24;

// Diferença em dias-calendário (UTC), inclusiva: uma janela que termina HOJE
// retorna 0 ("fecha hoje", ainda válida) e só vira negativa no dia seguinte.
// Normaliza ambos os lados ao início do dia para não depender da hora atual —
// `windowEnd` é uma data sem hora (ex.: "2026-07-08"), então Math.ceil dava
// off-by-one ao longo do próprio dia de fechamento.
export function daysUntil(iso: string, now = new Date()): number {
  const end = new Date(iso);
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((endDay - nowDay) / DAY);
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

// Uma oportunidade sem a norma-gatilho correspondente (erro de integridade do
// seed) é descartada em vez de derrubar a lista inteira com um TypeError.
function join(opp: Opportunity): OpportunityView | null {
  const norm = NORMS.find((n) => n.id === opp.normId);
  if (!norm) return null;
  return { ...opp, norm, daysRemaining: daysUntil(opp.windowEnd), windowState: windowState(opp.windowEnd) };
}

// "Ativa" = ainda acionável (nem expirada nem já capturada). Predicado único
// compartilhado pela lista e pelo sumário para não divergirem.
function isActive(status: Opportunity["status"]): boolean {
  return status !== "expired" && status !== "captured";
}

export type OppSort = "gain" | "deadline" | "confidence";

export function listOpportunities(opts?: {
  sector?: string;
  type?: OpportunityType;
  sort?: OppSort;
  status?: "active" | "all";
}): OpportunityView[] {
  let rows = OPPORTUNITIES.map(join).filter((o): o is OpportunityView => o !== null);
  if (opts?.status !== "all") {
    rows = rows.filter((o) => isActive(o.status));
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
  const active = OPPORTUNITIES.filter((o) => isActive(o.status));
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

// Persiste de fato a edição do perfil (muta o objeto in-memory) com coerção e
// limites por campo — sem mass-assignment. Antes, o PUT só devolvia mesclado e
// nada persistia. `jurisdictions` é normalizado (UF maiúscula, sem duplicatas).
export function updateStructure(patch: Record<string, unknown>): ClientStructure {
  if (typeof patch.legalName === "string") STRUCTURE.legalName = patch.legalName.slice(0, 200);
  if (typeof patch.regime === "string") STRUCTURE.regime = patch.regime.slice(0, 120);
  if (typeof patch.mainActivity === "string") STRUCTURE.mainActivity = patch.mainActivity.slice(0, 200);
  if (typeof patch.headquarters === "string") STRUCTURE.headquarters = patch.headquarters.slice(0, 120);

  const rev = Number(patch.annualRevenue);
  if (Number.isFinite(rev) && rev >= 0) STRUCTURE.annualRevenue = Math.min(rev, 1e15);
  const hc = Number(patch.headcount);
  if (Number.isFinite(hc) && hc >= 0) STRUCTURE.headcount = Math.min(Math.round(hc), 1e9);

  if (Array.isArray(patch.jurisdictions)) {
    const ufs = patch.jurisdictions
      .filter((j): j is string => typeof j === "string")
      .map((j) => j.trim().toUpperCase().slice(0, 4))
      .filter(Boolean);
    STRUCTURE.jurisdictions = [...new Set(ufs)].slice(0, 27); // 26 UFs + DF
  }
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

  // Fallback se o seed não tiver um cenário-baseline: economia 0 em vez de crash.
  const baseline = SCENARIOS.find((s) => s.isBaseline);
  const baselineBurden = baseline?.result.annualBurden ?? annualBurden;
  const annualSaving = baselineBurden - annualBurden;

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

// ── Feedback da IA (0A §2.7/§2.9) — alimenta o dataset de treino do AI Core ─────
// Isolado por tenant (orgId). Em produção, persistir + curar para finetune.
export interface AiFeedback {
  rating: "up" | "down";
  message: string;
  locale: string;
  userId: string;
  orgId: string;
  at: string; // ISO
}
const AI_FEEDBACK: AiFeedback[] = [];

export function recordAiFeedback(f: Omit<AiFeedback, "at">) {
  AI_FEEDBACK.push({ ...f, at: new Date().toISOString() });
  return aiFeedbackStats();
}
export function aiFeedbackStats() {
  const up = AI_FEEDBACK.filter((f) => f.rating === "up").length;
  return { total: AI_FEEDBACK.length, up, down: AI_FEEDBACK.length - up };
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
