// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos da API — reexporta contratos de @/server/domain/types (puras
// interfaces TypeScript; zero JS no bundle) e declara os tipos extras que só
// existiam em store.ts (OpportunityView, FirmClient, OppSort…).
//
// Ao importar tipos de domínio em componentes cliente, use SEMPRE este módulo
// em vez de @/server/domain/store para que o tree-shaking não arraste código
// de servidor para o bundle do browser.
// ─────────────────────────────────────────────────────────────────────────────

export type {
  Opportunity,
  OpportunityType,
  OpportunityStatus,
  Norm,
  NormLevel,
  ImpactSimulation,
  RecommendedMove,
  SavingsRecord,
  SavingsSummary,
  AgentRecommendation,
  ExecutionPlan,
  ExecutionStep,
  AuditEntry,
  StepStatus,
  Level,
  ScenarioParams,
  ScenarioResult,
  Scenario,
  ClientStructure,
  GroupEntity,
  FeatureFlag,
  Tenant,
  Plan,
  OwnerKpis,
  SectorId,
  SourceRef,
} from "@/server/domain/types";

import type { Opportunity, Norm } from "@/server/domain/types";

// ── Tipos originalmente em store.ts ──────────────────────────────────────────

export type WindowState = "fresh" | "open" | "closing" | "urgent" | "expired";
export type OppSort = "gain" | "deadline" | "confidence";

/** Oportunidade enriquecida com a norma-gatilho e metadados calculados. */
export interface OpportunityView extends Opportunity {
  norm: Norm;
  daysRemaining: number;
  windowState: WindowState;
}

/** Cliente da carteira do escritório de advocacia/contabilidade. */
export interface FirmClient {
  id: string;
  name: string;
  cnpj: string;
  sector: string;
  regime: string;
  mainActivity: string;
  businessProfile: string;
  jurisdictions: string[];
  annualRevenue: number;
  headquarters: string;
  capturedYtd: number;
  status: "active" | "onboarding" | "review";
}

/** Sumário rápido de oportunidades (retornado em meta.summary pelo GET /api/opportunities). */
export interface OppSummary {
  openWindows: number;
  openGain: number;
  closingSoon: number;
  capturedYtd: number;
}

/** Estatísticas da carteira de clientes do escritório. */
export interface PortfolioStats {
  clients: number;
  openBrechas: number;
  capturedYtd: number;
  activeClients: number;
}

/** Resposta tipada do /api/clients/[id]. */
export interface ClientDetail {
  client: FirmClient;
  brechas: OpportunityView[];
}

/** Item do radar normativo (Norm + daysSince + opportunityId opcional). */
export interface RadarItem extends Norm {
  daysSince: number;
  /** ID da oportunidade detectada a partir desta norma, se existir. */
  opportunityId?: string;
}

// ── Tipos de configurações / owner ────────────────────────────────────────────

export interface OrgSettings {
  orgName: string;
  defaultLocale: string;
  timezone: string;
  aiPersona: string;
  aiTone: string;
  whatsapp: string;
  sectors: string[];
  jurisdictions: string[];
}

export interface SystemSettings {
  platformName: string;
  supportEmail: string;
  defaultLocale: string;
  activeLocales: string[];
  enforceStrongPassword: boolean;
  mfaEnabled: boolean;
  maintenanceMode: boolean;
  sessionTtlHours: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  tenantName: string;
  period: string;
  amount: number;
  status: "paid" | "past_due" | "pending";
}

export interface BillingSummary {
  mrr: number;
  outstanding: number;
  collected: number;
}

export interface AiFeedbackStats {
  total: number;
  up: number;
  down: number;
  approvalRate: number;
}

export interface PermissionRow {
  id: string;
  module: string;
  roles: Record<string, boolean>;
}
