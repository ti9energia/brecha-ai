// ─────────────────────────────────────────────────────────────────────────────
// Store — repositórios em memória sobre o seed. Espelha o contrato que seria
// servido por Prisma/Postgres. Mutações persistem no processo (suficiente p/ demo).
//
// FRONTEIRA cliente↔servidor (dívida técnica consciente do demo): as views client
// importam estas funções e as executam NO NAVEGADOR (sem round-trip de API). Por
// isso este módulo NÃO leva `import "server-only"` — levaria a quebrar o build.
// Nada sensível vaza: só dados de seed + o motor fiscal (sem segredos; senhas/JWT
// ficam em auth/*, importados só pelo servidor). Caminho de produção: trocar o
// store por Postgres/Prisma e as views passarem a consumir as rotas `/api/*` (que
// já existem) ou Server Actions — aí o `server-only` entra. Ver AUDITORIA §3/§7.
// ─────────────────────────────────────────────────────────────────────────────
import {
  NORMS, OPPORTUNITIES, STRUCTURE, SCENARIOS, EXECUTION_PLANS, SAVINGS,
  AGENT_RECS, SECTORS, OWNER_KPIS, TENANTS, PLANS, FEATURE_FLAGS, AUDIT_LOG,
} from "./seed";
import type {
  Norm, Opportunity, ScenarioParams, ScenarioResult, Level, OpportunityType, ClientStructure,
  Tenant, Plan, SectorId, Scenario, StepStatus,
} from "./types";
import { emit } from "@/server/events/bus";

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

// Persiste um cenário simulado (botão "Salvar cenário"). Aparece em listScenarios().
let scnSeq = 0;
export function saveScenario(name: string, params: ScenarioParams, result: ScenarioResult): Scenario {
  const scn: Scenario = { id: `scn-user-${++scnSeq}`, name: (name || "Cenário").slice(0, 80), params, result };
  SCENARIOS.push(scn);
  recordAiAction({ actor: "Simulador", action: "Cenário salvo", detail: scn.name });
  return scn;
}

// Cria uma Oportunidade real a partir de um cenário do simulador (botão "Transformar
// em oportunidade"). Vira uma janela aberta de verdade — abre no detalhe.
let simOppSeq = 0;
export function createOpportunityFromScenario(params: ScenarioParams, result: ScenarioResult): Opportunity {
  const norm = NORMS[0]; // norma-gatilho de referência (demo)
  const now = new Date();
  const burdenBefore = result.annualBurden + Math.max(0, result.annualSaving);
  const risk = result.riskLevel === "high" ? 60 : result.riskLevel === "medium" ? 40 : 20;
  const opp: Opportunity = {
    id: `opp-sim-${++simOppSeq}`,
    normId: norm.id,
    type: /SUDENE|SUFRAMA/i.test(params.jurisdiction) ? "jurisdiction" : "regime",
    title: `Reorganização simulada — ${params.regime} · ${params.jurisdiction}`,
    summary: `Oportunidade criada no simulador: ${params.regime}, ${params.jurisdiction}, ${params.classification}.`,
    sector: "industry",
    estimatedGain: Math.max(0, result.annualSaving),
    windowStart: now.toISOString(),
    windowEnd: new Date(now.getTime() + 60 * DAY).toISOString(),
    effort: result.riskLevel,
    confidence: 0.7,
    status: "open",
    correlatedNorms: 1,
    recommendedMove: {
      headline: `Migrar para ${params.regime} em ${params.jurisdiction}`,
      fromState: "Estrutura atual",
      toState: `${params.regime} · ${params.jurisdiction}`,
      rationale: ["Gerado a partir do simulador fiscal", `Economia projetada de ${Math.round(result.annualSaving)} /ano`],
      requirements: ["Validação do tributarista", "Atualização cadastral / protocolo"],
    },
    simulation: {
      effectiveRateBefore: 0.18,
      effectiveRateAfter: result.effectiveRate,
      annualBurdenBefore: burdenBefore,
      annualBurdenAfter: result.annualBurden,
      riskBefore: 20,
      riskAfter: risk,
      annualGain: Math.max(0, result.annualSaving),
      assumptions: ["Cenário do simulador (motor determinístico)"],
    },
    createdAt: now.toISOString(),
  };
  OPPORTUNITIES.unshift(opp);
  recordAiAction({ actor: "Simulador", action: "Oportunidade criada", detail: opp.title });
  emit("opportunity.simulated", { id: opp.id, gain: opp.estimatedGain });
  return opp;
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
  emit("execution.approved", { opportunityId, title: opp?.title ?? opportunityId, approver });
  return getExecutionPlan(opportunityId);
}

// Avança o status de um passo no ciclo todo → doing → done → todo (blocked → doing),
// recalcula o progresso do plano e reflete o status macro. Botão na tela de Execução —
// antes os passos eram somente-leitura e o progresso ficava preso no valor do seed.
const STEP_NEXT: Record<StepStatus, StepStatus> = {
  todo: "doing",
  doing: "done",
  done: "todo",
  blocked: "doing",
};
export function advanceExecutionStep(planId: string, stepId: string) {
  const plan = EXECUTION_PLANS.find((p) => p.id === planId);
  if (!plan) return null;
  const step = plan.steps.find((s) => s.id === stepId);
  if (!step) return null;
  step.status = STEP_NEXT[step.status] ?? "doing";
  const done = plan.steps.filter((s) => s.status === "done").length;
  plan.progress = plan.steps.length ? Math.round((done / plan.steps.length) * 100) / 100 : 0;
  if (plan.progress >= 1) plan.status = "captured";
  else if (plan.approved) plan.status = "executing";
  recordAiAction({ actor: "Execução", action: "Passo atualizado", detail: `${step.title} → ${step.status}` });
  return getExecutionPlan(plan.id);
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

// ── Configurações da org (in-memory, persistente no processo) ─────────────────
export interface AppSettings {
  orgName: string;
  defaultLocale: string;
  timezone: string;
  aiPersona: string;
  aiTone: string;
  whatsapp: string;
  sectors: string[]; // ids de setor monitorados
  jurisdictions: string[]; // UFs vigiadas pelo radar
}
const SETTINGS: AppSettings = {
  orgName: STRUCTURE.legalName,
  defaultLocale: "pt-BR",
  timezone: "America/Sao_Paulo (BRT)",
  aiPersona: "Vega",
  aiTone: "Consultivo e direto",
  whatsapp: "+55 11 9 9999-0000",
  sectors: ["industry", "tech", "energy"],
  jurisdictions: ["SP", "SC", "MG"],
};
export function getSettings(): AppSettings {
  return SETTINGS;
}
export function updateSettings(patch: Record<string, unknown>): AppSettings {
  if (typeof patch.orgName === "string") SETTINGS.orgName = patch.orgName.slice(0, 200);
  if (typeof patch.defaultLocale === "string") SETTINGS.defaultLocale = patch.defaultLocale.slice(0, 10);
  if (typeof patch.timezone === "string") SETTINGS.timezone = patch.timezone.slice(0, 60);
  if (typeof patch.aiPersona === "string") SETTINGS.aiPersona = patch.aiPersona.slice(0, 60);
  if (typeof patch.aiTone === "string") SETTINGS.aiTone = patch.aiTone.slice(0, 60);
  if (typeof patch.whatsapp === "string") SETTINGS.whatsapp = patch.whatsapp.slice(0, 40);
  if (Array.isArray(patch.sectors)) {
    SETTINGS.sectors = patch.sectors.filter((s): s is string => typeof s === "string").slice(0, 50);
  }
  if (Array.isArray(patch.jurisdictions)) {
    const ufs = patch.jurisdictions.filter((j): j is string => typeof j === "string").map((j) => j.toUpperCase());
    SETTINGS.jurisdictions = [...new Set(ufs)].slice(0, 27);
  }
  return SETTINGS;
}
export function getPlans() {
  return PLANS;
}

// ── Entitlements (0C §4.4 / 0D §3): acesso = papel E PLANO ──────────────────────
// O plano do tenant libera um conjunto de módulos; o papel decide o que fazer dentro.
// Em produção, o plano vem do billing por orgId; no demo, mapeado.
const ORG_PLAN: Record<string, string> = { "org-acme": "plan-execution" };
// Só estes módulos dependem de plano (aparecem em algum `entitlements`). Governança
// (settings/owner) e o detalhe são gateados por PAPEL, não por plano.
const PLAN_GATED_MODULES = new Set([
  "radar", "structure", "simulator", "opportunities", "execution", "agent", "savings",
]);
export function orgEntitlements(orgId: string): string[] {
  const planId = ORG_PLAN[orgId] ?? "plan-execution";
  return PLANS.find((p) => p.id === planId)?.entitlements ?? [];
}
export function isModuleEntitled(moduleId: string, entitlements: string[]): boolean {
  if (!PLAN_GATED_MODULES.has(moduleId)) return true; // núcleo/governança: independe de plano
  return entitlements.includes(moduleId);
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

// ── Painel do Dono — CRUD (0C §2.2/§2.4/§8). Muta o store in-memory + audita. ───
let tenantSeq = 0;
export function createTenant(input: { name?: string; plan?: string; locale?: string; sector?: SectorId }): Tenant {
  const t: Tenant = {
    id: `tenant-${TENANTS.length}-${++tenantSeq}`,
    name: (typeof input.name === "string" && input.name.trim() ? input.name : "Novo tenant").slice(0, 120),
    plan: typeof input.plan === "string" ? input.plan : "plan-structure",
    status: "trial",
    mrr: 0,
    users: 1,
    capturedNet: 0,
    aiSpend: 0,
    locale: typeof input.locale === "string" ? input.locale : "pt-BR",
    sector: input.sector ?? "industry",
  };
  TENANTS.unshift(t);
  recordAiAction({ actor: "platform_owner", action: "Tenant criado", detail: t.name });
  emit("tenant.created", { id: t.id, name: t.name });
  return t;
}

const TENANT_STATUSES = new Set<Tenant["status"]>(["active", "trial", "suspended", "past_due"]);
export function setTenantStatus(id: string, status: string): Tenant | null {
  const t = TENANTS.find((x) => x.id === id);
  if (!t || !TENANT_STATUSES.has(status as Tenant["status"])) return null;
  t.status = status as Tenant["status"];
  recordAiAction({ actor: "platform_owner", action: "Tenant atualizado", detail: `${t.name} → ${status}` });
  emit("tenant.status_changed", { id: t.id, status: t.status });
  return t;
}

export function updatePlan(id: string, patch: Record<string, unknown>): Plan | null {
  const p = PLANS.find((x) => x.id === id);
  if (!p) return null;
  if (typeof patch.price === "number" && Number.isFinite(patch.price) && patch.price >= 0) p.price = Math.min(patch.price, 1e9);
  if (typeof patch.feeRate === "number" && patch.feeRate >= 0 && patch.feeRate <= 1) p.feeRate = patch.feeRate;
  if (typeof patch.tagline === "string") p.tagline = patch.tagline.slice(0, 160);
  if (Array.isArray(patch.entitlements)) {
    p.entitlements = [...new Set(patch.entitlements.filter((e): e is string => typeof e === "string"))].slice(0, 50);
  }
  recordAiAction({ actor: "platform_owner", action: "Plano atualizado", detail: p.name });
  emit("plan.updated", { id: p.id, name: p.name });
  return p;
}

// ── Config por tenant (0C §2.8/2.9): persona/tom da IA + número de WhatsApp ─────
export interface TenantConfig {
  aiPersona?: string;
  aiTone?: string;
  whatsapp?: string;
}
const TENANT_CONFIG: Record<string, TenantConfig> = {};
export function getTenantConfig(tenantId: string): TenantConfig {
  return TENANT_CONFIG[tenantId] ?? {};
}
export function updateTenantConfig(tenantId: string, patch: Record<string, unknown>): TenantConfig {
  const cur = (TENANT_CONFIG[tenantId] ??= {});
  if (typeof patch.aiPersona === "string") cur.aiPersona = patch.aiPersona.slice(0, 60);
  if (typeof patch.aiTone === "string") cur.aiTone = patch.aiTone.slice(0, 60);
  if (typeof patch.whatsapp === "string") cur.whatsapp = patch.whatsapp.slice(0, 40);
  recordAiAction({ actor: "platform_owner", action: "Config do tenant atualizada", detail: tenantId });
  return cur;
}

// ── Billing (0C §2.7): assinaturas/faturas in-memory por tenant ────────────────
export interface Invoice {
  id: string;
  tenantId: string;
  tenantName: string;
  period: string; // "2026-06"
  amount: number; // R$
  status: "open" | "paid" | "past_due";
  issuedAt: string; // ISO
}
const INVOICES: Invoice[] = [];
let invSeq = 0;
// Seed: 3 meses por tenant a partir do MRR (datas fixas — sem Date.now p/ a UI client).
for (const tn of TENANTS) {
  const months = ["2026-04", "2026-05", "2026-06"];
  months.forEach((p, i) => {
    const last = i === months.length - 1;
    INVOICES.push({
      id: `inv-${tn.id}-${p}`,
      tenantId: tn.id,
      tenantName: tn.name,
      period: p,
      amount: tn.mrr,
      status: last ? (tn.status === "past_due" ? "past_due" : "open") : "paid",
      issuedAt: `${p}-01T00:00:00Z`,
    });
  });
}
export function listInvoices(tenantId?: string): Invoice[] {
  const rows = tenantId ? INVOICES.filter((x) => x.tenantId === tenantId) : INVOICES;
  return [...rows].sort((a, b) => b.period.localeCompare(a.period) || a.tenantName.localeCompare(b.tenantName));
}
export function billingSummary() {
  const mrr = TENANTS.filter((t) => t.status === "active" || t.status === "trial").reduce((s, t) => s + t.mrr, 0);
  const outstanding = INVOICES.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amount, 0);
  const collected = INVOICES.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  return { mrr, outstanding, collected, invoices: INVOICES.length };
}
export function markInvoicePaid(id: string): Invoice | null {
  const inv = INVOICES.find((x) => x.id === id);
  if (!inv) return null;
  inv.status = "paid";
  recordAiAction({ actor: "platform_owner", action: "Fatura paga", detail: `${inv.tenantName} · ${inv.period}` });
  return inv;
}
export function generateInvoice(tenantId: string): Invoice | null {
  const tn = TENANTS.find((x) => x.id === tenantId);
  if (!tn) return null;
  const inv: Invoice = {
    id: `inv-${tn.id}-gen-${++invSeq}`,
    tenantId: tn.id,
    tenantName: tn.name,
    period: "2026-07",
    amount: tn.mrr,
    status: "open",
    issuedAt: "2026-07-01T00:00:00Z",
  };
  INVOICES.unshift(inv);
  recordAiAction({ actor: "platform_owner", action: "Fatura gerada", detail: `${tn.name} · ${inv.period}` });
  return inv;
}

// ── CMS da landing (0C §2.5): overrides por locale do conteúdo do herói ─────────
// Vazio = usa o catálogo i18n. O dono edita; a landing aplica o override quando há.
export const LANDING_FIELDS = ["heroTitleA", "heroTitleB", "heroSub", "heroCta", "heroNote"] as const;
export type LandingField = (typeof LANDING_FIELDS)[number];
const LANDING_CMS: Record<string, Partial<Record<LandingField, string>>> = {};
export function getLandingContent(locale: string): Partial<Record<LandingField, string>> {
  return LANDING_CMS[locale] ?? {};
}
export function updateLandingContent(locale: string, patch: Record<string, unknown>): Partial<Record<LandingField, string>> {
  const cur = (LANDING_CMS[locale] ??= {});
  for (const f of LANDING_FIELDS) {
    if (typeof patch[f] === "string") {
      const v = (patch[f] as string).slice(0, 400);
      if (v.trim()) cur[f] = v;
      else delete cur[f]; // vazio = volta ao padrão do catálogo
    }
  }
  recordAiAction({ actor: "platform_owner", action: "Landing CMS atualizado", detail: locale });
  return cur;
}

// Governança (0A §2.8 / 0B §3): toda ação da IA (tool invocada, comando de
// WhatsApp) entra na trilha imutável — prepende (mais recente no topo).
let aiAuditSeq = 0;
export function recordAiAction(entry: { actor: string; action: string; detail: string }) {
  AUDIT_LOG.unshift({
    id: `ai-${++aiAuditSeq}`,
    at: new Date().toISOString(),
    actor: entry.actor,
    tenant: STRUCTURE.legalName,
    action: entry.action,
    detail: entry.detail.slice(0, 160),
  });
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
// Histórico-semente para o Painel do Dono não começar zerado; votos reais somam.
for (let i = 0; i < 48; i++) {
  AI_FEEDBACK.push({ rating: i % 8 === 0 ? "down" : "up", message: "", locale: "pt-BR", userId: "seed", orgId: "org-acme", at: "2026-06-20T12:00:00Z" });
}

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
