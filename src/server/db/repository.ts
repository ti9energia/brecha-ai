// ─────────────────────────────────────────────────────────────────────────────
// Seam de persistência (0D / "// SWAP produção"). Um único contrato (leitura +
// escrita) que duas implementações satisfazem: InMemory (seed, default zero-config)
// e Prisma (Postgres, quando DATABASE_URL existe). As rotas falam SÓ com este
// contrato — trocar o backing store é configuração, não reescrita.
// ─────────────────────────────────────────────────────────────────────────────
import type { OpportunityView, RadarItem, OppSort, AppSettings, AiFeedback } from "@/server/domain/store";
import type { OpportunityType, ClientStructure, SavingsSummary, AgentRecommendation } from "@/server/domain/types";
import { InMemoryRepository } from "./inMemoryRepository";
import { PrismaRepository } from "./prismaRepository";

export interface OpportunitiesSummary {
  openWindows: number;
  openGain: number;
  closingSoon: number;
  capturedYtd: number;
}

export interface RadarRow extends RadarItem {
  opportunityId: string | null;
}

export interface ListOpportunitiesOpts {
  sector?: string;
  type?: OpportunityType;
  sort?: OppSort;
  status?: "active" | "all";
}

export interface AiFeedbackStats {
  total: number;
  up: number;
  down: number;
}

export interface Repository {
  // ── leitura ──────────────────────────────────────────────────────────────
  listOpportunities(opts?: ListOpportunitiesOpts): Promise<OpportunityView[]>;
  getOpportunity(id: string): Promise<OpportunityView | null>;
  opportunitiesSummary(): Promise<OpportunitiesSummary>;
  listRadar(opts?: { level?: string; sector?: string }): Promise<RadarRow[]>;
  getStructure(orgId?: string): Promise<ClientStructure>; // multi-tenant: escopado por orgId
  getSavings(orgId?: string): Promise<SavingsSummary>;   // loop da economia (08 §7)
  listAgentRecs(): Promise<AgentRecommendation[]>;        // recomendações do agente (0A §2.6)
  getSettings(orgId?: string): Promise<AppSettings>;     // configurações da org
  // ── escrita (write-side — 0D §2): mesmo backing store para leitura e escrita, ──
  // evitando split-brain quando DATABASE_URL está setado.
  updateStructure(patch: Record<string, unknown>, orgId?: string): Promise<ClientStructure>;
  approveExecution(opportunityId: string, approver: string): Promise<unknown>;
  advanceExecutionStep(planId: string, stepId: string): Promise<unknown>; // loop captura (08 §7)
  reconcileSaving(id: string): Promise<SavingsSummary | null>;            // conciliação (08 §7)
  updateSettings(patch: Record<string, unknown>, orgId?: string): Promise<AppSettings>;
  recordAiFeedback(f: Omit<AiFeedback, "at">): Promise<AiFeedbackStats>; // treino (0A §2.9)
}

let cached: Repository | null = null;

// Seleciona o backing store: Postgres se DATABASE_URL estiver setado, senão o seed
// in-memory (demo). O PrismaClient só é CONSTRUÍDO nesse caminho (import da classe
// é inócuo); estas rotas rodam no runtime Node, nunca no edge/middleware.
export function getRepository(): Repository {
  if (!cached) {
    cached = process.env.DATABASE_URL ? new PrismaRepository() : new InMemoryRepository();
  }
  return cached;
}

// Para testes: permite resetar/injetar o repositório.
export function __setRepository(repo: Repository | null) {
  cached = repo;
}
