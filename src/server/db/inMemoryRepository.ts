// Implementação in-memory do Repository — delega ao store do seed (sync), embrulhado
// em Promise. É o default zero-config: sem DATABASE_URL, o app roda exatamente como
// antes. Mantém o contrato idêntico ao PrismaRepository.
import {
  listOpportunities, getOpportunity, opportunitiesSummary, listRadar,
  opportunityForNorm, approveExecution, advanceExecutionStep, getSavings,
  reconcileSaving, listAgentRecs, getSettings, updateSettings, recordAiFeedback,
  aiFeedbackStats,
  type AppSettings, type AiFeedback,
} from "@/server/domain/store";
import { structureForOrg, updateStructureForOrg } from "./tenantData";
import type {
  Repository, ListOpportunitiesOpts, OpportunitiesSummary, RadarRow, AiFeedbackStats,
} from "./repository";
import type { OpportunityView } from "@/server/domain/store";
import type { ClientStructure, SavingsSummary, AgentRecommendation } from "@/server/domain/types";

export class InMemoryRepository implements Repository {
  // ── leitura ────────────────────────────────────────────────────────────────
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
  async getStructure(orgId = "org-acme"): Promise<ClientStructure> {
    return structureForOrg(orgId);
  }
  async getSavings(_orgId = "org-acme"): Promise<SavingsSummary> {
    // In-memory: global (seed não é multi-tenant em savings). Em produção, filtraria por orgId.
    return getSavings();
  }
  async listAgentRecs(): Promise<AgentRecommendation[]> {
    return listAgentRecs().map((r) => {
      // Remove a propriedade `opportunity` (join extra) para aderir ao tipo AgentRecommendation
      const { opportunity: _opp, ...rec } = r as typeof r & { opportunity?: unknown };
      return rec as AgentRecommendation;
    });
  }
  async getSettings(_orgId = "org-acme"): Promise<AppSettings> {
    return getSettings();
  }

  // ── escrita ────────────────────────────────────────────────────────────────
  async updateStructure(patch: Record<string, unknown>, orgId = "org-acme"): Promise<ClientStructure> {
    return updateStructureForOrg(orgId, patch);
  }
  async approveExecution(opportunityId: string, approver: string): Promise<unknown> {
    return approveExecution(opportunityId, approver);
  }
  async advanceExecutionStep(planId: string, stepId: string): Promise<unknown> {
    return advanceExecutionStep(planId, stepId);
  }
  async reconcileSaving(id: string): Promise<SavingsSummary | null> {
    return reconcileSaving(id);
  }
  async updateSettings(patch: Record<string, unknown>, _orgId = "org-acme"): Promise<AppSettings> {
    return updateSettings(patch);
  }
  async recordAiFeedback(f: Omit<AiFeedback, "at">): Promise<AiFeedbackStats> {
    recordAiFeedback(f);
    return aiFeedbackStats();
  }
}
