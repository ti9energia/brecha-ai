// Implementação in-memory do Repository — delega ao store do seed (sync), embrulhado
// em Promise. É o default zero-config: sem DATABASE_URL, o app roda exatamente como
// antes. Mantém o contrato idêntico ao PrismaRepository.
import {
  listOpportunities, getOpportunity, opportunitiesSummary, listRadar,
  opportunityForNorm, getStructure,
} from "@/server/domain/store";
import type { Repository, ListOpportunitiesOpts, OpportunitiesSummary, RadarRow } from "./repository";
import type { OpportunityView } from "@/server/domain/store";
import type { ClientStructure } from "@/server/domain/types";

export class InMemoryRepository implements Repository {
  async listOpportunities(opts?: ListOpportunitiesOpts): Promise<OpportunityView[]> {
    return listOpportunities(opts);
  }
  async getOpportunity(id: string): Promise<OpportunityView | null> {
    return getOpportunity(id);
  }
  async opportunitiesSummary(): Promise<OpportunitiesSummary> {
    return opportunitiesSummary();
  }
  async listRadar(opts?: { level?: string; sector?: string }): Promise<RadarRow[]> {
    return listRadar(opts).map((n) => ({ ...n, opportunityId: opportunityForNorm(n.id)?.id ?? null }));
  }
  async getStructure(): Promise<ClientStructure> {
    return getStructure();
  }
}
