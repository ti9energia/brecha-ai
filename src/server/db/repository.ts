// ─────────────────────────────────────────────────────────────────────────────
// Seam de persistência (0D / "// SWAP produção"). Um único contrato de leitura que
// duas implementações satisfazem: InMemory (seed, default zero-config) e Prisma
// (Postgres, quando DATABASE_URL existe). As rotas falam SÓ com este contrato —
// trocar o backing store é configuração, não reescrita.
// ─────────────────────────────────────────────────────────────────────────────
import type { OpportunityView, RadarItem, OppSort } from "@/server/domain/store";
import type { OpportunityType, ClientStructure } from "@/server/domain/types";
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

export interface Repository {
  listOpportunities(opts?: ListOpportunitiesOpts): Promise<OpportunityView[]>;
  getOpportunity(id: string): Promise<OpportunityView | null>;
  opportunitiesSummary(): Promise<OpportunitiesSummary>;
  listRadar(opts?: { level?: string; sector?: string }): Promise<RadarRow[]>;
  getStructure(): Promise<ClientStructure>;
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
