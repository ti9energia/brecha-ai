// ─────────────────────────────────────────────────────────────────────────────
// Domínio Brecha.ai — modelo de dados (spec 08 §6 + 0C). Fonte única de verdade
// dos contratos FE↔BE (espelha o que seria os schemas Zod / modelos Prisma).
// ─────────────────────────────────────────────────────────────────────────────

export type NormLevel = "federal" | "state" | "municipal";
export type OpportunityType = "regime" | "incentive" | "jurisdiction" | "classification" | "credit";
export type OpportunityStatus =
  | "open"
  | "simulating"
  | "pending_approval"
  | "approved"
  | "executing"
  | "captured"
  | "expired";
export type Level = "low" | "medium" | "high";
export type StepStatus = "todo" | "doing" | "blocked" | "done";
export type SectorId =
  | "industry"
  | "agribusiness"
  | "tech"
  | "retail"
  | "logistics"
  | "energy"
  | "health"
  | "finance"
  | "construction";

export interface SourceRef {
  name: string; // "Diário Oficial da União", "CONFAZ", "DOM São Paulo"
  ref: string; // "Convênio ICMS 178/2025"
  url: string;
}

export interface Norm {
  id: string;
  level: NormLevel;
  jurisdiction: string; // "Brasil", "SP", "Município de São Paulo"
  title: string;
  summary: string;
  body: string;
  source: SourceRef;
  publishedAt: string; // ISO
  effectiveDate: string; // ISO
  relevance: number; // 0..1 — relevância p/ a estrutura do cliente
  sector: SectorId;
  tags: string[];
  matched: boolean; // cruzou com a estrutura do cliente
}

export interface ImpactSimulation {
  effectiveRateBefore: number; // 0..1
  effectiveRateAfter: number;
  annualBurdenBefore: number; // R$
  annualBurdenAfter: number;
  riskBefore: number; // 0..100 (risco de contestação)
  riskAfter: number;
  annualGain: number; // R$
  assumptions: string[];
}

export interface RecommendedMove {
  headline: string;
  fromState: string;
  toState: string;
  rationale: string[];
  requirements: string[];
}

export interface Opportunity {
  id: string;
  normId: string;
  type: OpportunityType;
  title: string;
  summary: string;
  sector: SectorId;
  estimatedGain: number; // R$/ano
  windowStart: string; // ISO
  windowEnd: string; // ISO
  effort: Level;
  confidence: number; // 0..1
  status: OpportunityStatus;
  correlatedNorms: number;
  recommendedMove: RecommendedMove;
  simulation: ImpactSimulation;
  createdAt: string;
}

export interface GroupEntity {
  name: string;
  cnpj: string;
  regime: string;
  uf: string;
}

export interface ClientStructure {
  legalName: string;
  taxId: string;
  regime: string;
  mainActivity: string;
  mainCnae: string;
  activities: { code: string; label: string }[];
  jurisdictions: string[]; // UFs
  headquarters: string;
  annualRevenue: number;
  headcount: number;
  entities: GroupEntity[];
  completeness: number; // 0..1
  lastReview: string;
}

export interface ScenarioParams {
  regime: string;
  jurisdiction: string;
  classification: string;
  revenue: number;
}

export interface ScenarioResult {
  annualBurden: number;
  annualSaving: number; // vs baseline
  effectiveRate: number;
  riskLevel: Level;
  paybackMonths: number;
}

export interface Scenario {
  id: string;
  name: string;
  isBaseline?: boolean;
  params: ScenarioParams;
  result: ScenarioResult;
}

export interface ExecutionStep {
  id: string;
  title: string;
  detail: string;
  status: StepStatus;
  assignee: string;
  due: string; // ISO
  document?: string;
}

export interface AuditEntry {
  id: string;
  at: string; // ISO
  actor: string;
  action: string;
  detail: string;
}

export interface ExecutionPlan {
  id: string;
  opportunityId: string;
  title: string;
  approver: string;
  approved: boolean;
  approvedBy?: string;
  status: OpportunityStatus;
  progress: number; // 0..1
  steps: ExecutionStep[];
  audit: AuditEntry[];
}

export interface SavingsRecord {
  id: string;
  opportunityId: string;
  playTitle: string;
  type: OpportunityType;
  realizedGain: number;
  quarter: string; // "2026-Q1"
  reconciled: boolean;
  capturedAt: string;
}

export interface SavingsSummary {
  currency: string;
  realizedYtd: number;
  inExecution: number;
  projected12m: number;
  feeBase: number;
  feeRate: number;
  feeDue: number;
  byQuarter: { quarter: string; realized: number; projected: number }[];
  records: SavingsRecord[];
}

export interface AgentRecommendation {
  id: string;
  kind: "window_closing" | "new_opportunity" | "structure_gap" | "reconcile";
  title: string;
  body: string;
  impact: number; // R$
  confidence: number;
  opportunityId?: string;
  createdAt: string;
}

// ── Painel do Dono (0C) ──────────────────────────────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  plan: string;
  status: "active" | "trial" | "suspended" | "past_due";
  mrr: number;
  users: number;
  capturedNet: number;
  aiSpend: number;
  locale: string;
  sector: SectorId;
}

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  price: number; // mensal R$
  period: "month";
  popular?: boolean;
  feeRate: number; // success fee
  features: string[];
  entitlements: string[]; // módulos liberados
  quotas: { users: number | "∞"; jurisdictions: number | "∞"; aiCredits: string };
}

export interface FeatureFlag {
  module: string;
  label: string;
  scope: "global" | "plan" | "tenant";
  enabled: boolean;
  rollout: number; // 0..100
}

export interface OwnerKpis {
  mrr: number;
  mrrDelta: number;
  activeTenants: number;
  tenantsDelta: number;
  aiSpend: number;
  capturedNet: number;
  errorRate: number;
  mrrSeries: number[];
}

export interface Sector {
  id: SectorId;
  label: string;
  icon: string;
  blurb: string;
}

// Envelope de resposta padrão (00-PADRAO §4).
export interface ApiEnvelope<T> {
  data: T | null;
  meta?: Record<string, unknown>;
  error: { code: string; messageKey: string } | null;
}
