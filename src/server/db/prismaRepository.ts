// Implementação Postgres do Repository (Prisma). Ativada quando DATABASE_URL existe.
// Mapeia linhas do Prisma → tipos de domínio (datas→ISO, colunas Json→value-objects)
// e reusa daysUntil/windowState para os campos derivados — mesma semântica do seed.
//
// NOTA: verificado por typecheck + `prisma generate` (offline). As queries só rodam
// contra um Postgres real — rode `npm run db:migrate && npm run db:seed` e aponte
// DATABASE_URL para validar em runtime.
import { getPrisma } from "./client";
import { daysUntil, windowState, type OpportunityView } from "@/server/domain/store";
import type {
  Repository, ListOpportunitiesOpts, OpportunitiesSummary, RadarRow,
} from "./repository";
import type {
  Norm, NormLevel, SourceRef, SectorId, OpportunityType, Level,
  OpportunityStatus, RecommendedMove, ImpactSimulation, ClientStructure,
} from "@/server/domain/types";
import { Prisma } from "@prisma/client";
import type {
  Norm as PNorm, Opportunity as POpp, ClientStructure as PStructure,
} from "@prisma/client";

const DAY = 1000 * 60 * 60 * 24;
const isActive = (s: string) => s !== "expired" && s !== "captured";

function mapNorm(n: PNorm): Norm {
  return {
    id: n.id,
    level: n.level as NormLevel,
    jurisdiction: n.jurisdiction,
    title: n.title,
    summary: n.summary,
    body: n.body,
    source: n.source as unknown as SourceRef,
    publishedAt: n.publishedAt.toISOString(),
    effectiveDate: n.effectiveDate.toISOString(),
    relevance: n.relevance,
    sector: n.sector as SectorId,
    tags: n.tags,
    matched: n.matched,
  };
}

function mapOpp(o: POpp, norm: Norm): OpportunityView {
  const windowEnd = o.windowEnd.toISOString();
  return {
    id: o.id,
    normId: o.normId,
    type: o.type as OpportunityType,
    title: o.title,
    summary: o.summary,
    sector: o.sector as SectorId,
    estimatedGain: o.estimatedGain,
    windowStart: o.windowStart.toISOString(),
    windowEnd,
    effort: o.effort as Level,
    confidence: o.confidence,
    status: o.status as OpportunityStatus,
    correlatedNorms: o.correlatedNorms,
    recommendedMove: o.recommendedMove as unknown as RecommendedMove,
    simulation: o.simulation as unknown as ImpactSimulation,
    createdAt: o.createdAt.toISOString(),
    norm,
    daysRemaining: daysUntil(windowEnd),
    windowState: windowState(windowEnd),
  };
}

function mapStructure(s: PStructure): ClientStructure {
  return {
    legalName: s.legalName,
    taxId: s.taxId,
    regime: s.regime,
    mainActivity: s.mainActivity,
    mainCnae: s.mainCnae,
    businessProfile: s.businessProfile,
    activities: s.activities as unknown as ClientStructure["activities"],
    jurisdictions: s.jurisdictions,
    headquarters: s.headquarters,
    annualRevenue: s.annualRevenue,
    headcount: s.headcount,
    entities: s.entities as unknown as ClientStructure["entities"],
    completeness: s.completeness,
    lastReview: s.lastReview,
  };
}

export class PrismaRepository implements Repository {
  async listOpportunities(opts?: ListOpportunitiesOpts): Promise<OpportunityView[]> {
    const rows = await getPrisma().opportunity.findMany({ include: { norm: true } });
    let views = rows.map((r) => mapOpp(r, mapNorm(r.norm)));
    if (opts?.status !== "all") views = views.filter((o) => isActive(o.status));
    if (opts?.sector && opts.sector !== "all") views = views.filter((o) => o.sector === opts.sector);
    if (opts?.type) views = views.filter((o) => o.type === opts.type);
    const sort = opts?.sort ?? "gain";
    views.sort((a, b) => {
      if (sort === "deadline") return a.daysRemaining - b.daysRemaining;
      if (sort === "confidence") return b.confidence - a.confidence;
      return b.estimatedGain - a.estimatedGain;
    });
    return views;
  }

  async getOpportunity(id: string): Promise<OpportunityView | null> {
    const o = await getPrisma().opportunity.findUnique({ where: { id }, include: { norm: true } });
    return o ? mapOpp(o, mapNorm(o.norm)) : null;
  }

  async opportunitiesSummary(): Promise<OpportunitiesSummary> {
    const rows = await getPrisma().opportunity.findMany();
    const active = rows.filter((o) => isActive(o.status));
    const openGain = active.reduce((s, o) => s + o.estimatedGain, 0);
    // Mesmo critério do store in-memory (store.ts opportunitiesSummary): piso >= 0
    // para não contar janelas já vencidas como "fechando em breve".
    const closingSoon = active.filter((o) => {
      const d = daysUntil(o.windowEnd.toISOString());
      return d >= 0 && d <= 21;
    }).length;
    const savings = await getPrisma().savingsRecord.aggregate({ _sum: { realizedGain: true } });
    return {
      openWindows: active.length,
      openGain,
      closingSoon,
      capturedYtd: savings._sum.realizedGain ?? 0,
    };
  }

  async listRadar(opts?: { level?: string; sector?: string }): Promise<RadarRow[]> {
    let norms = await getPrisma().norm.findMany();
    if (opts?.level && opts.level !== "all") norms = norms.filter((n) => n.level === opts.level);
    if (opts?.sector && opts.sector !== "all") norms = norms.filter((n) => n.sector === opts.sector);
    norms.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    const opps = await getPrisma().opportunity.findMany({ select: { id: true, normId: true } });
    const byNorm = new Map(opps.map((o) => [o.normId, o.id]));
    const now = Date.now();
    return norms.map((n) => ({
      ...mapNorm(n),
      daysSince: Math.max(0, Math.floor((now - n.publishedAt.getTime()) / DAY)),
      opportunityId: byNorm.get(n.id) ?? null,
    }));
  }

  async getStructure(orgId = "org-acme"): Promise<ClientStructure> {
    const s = await getPrisma().clientStructure.findFirst({ where: { orgId } });
    if (!s) throw new Error("ClientStructure não encontrada — rode `npm run db:seed`.");
    return mapStructure(s);
  }

  async updateStructure(patch: Record<string, unknown>, orgId = "org-acme"): Promise<ClientStructure> {
    const cur = await getPrisma().clientStructure.findFirst({ where: { orgId } });
    if (!cur) throw new Error("ClientStructure não encontrada — rode `npm run db:seed`.");
    const data: Prisma.ClientStructureUpdateInput = {};
    if (typeof patch.legalName === "string") data.legalName = patch.legalName.slice(0, 200);
    if (typeof patch.regime === "string") data.regime = patch.regime.slice(0, 120);
    if (typeof patch.mainActivity === "string") data.mainActivity = patch.mainActivity.slice(0, 200);
    if (typeof patch.businessProfile === "string") data.businessProfile = patch.businessProfile.slice(0, 2000);
    if (typeof patch.headquarters === "string") data.headquarters = patch.headquarters.slice(0, 120);
    const rev = Number(patch.annualRevenue);
    if (Number.isFinite(rev) && rev >= 0) data.annualRevenue = Math.min(rev, 1e15);
    const hc = Number(patch.headcount);
    if (Number.isFinite(hc) && hc >= 0) data.headcount = Math.min(Math.round(hc), 1e9);
    if (Array.isArray(patch.jurisdictions)) {
      data.jurisdictions = [
        ...new Set(
          (patch.jurisdictions as unknown[])
            .filter((j): j is string => typeof j === "string")
            .map((j) => j.trim().toUpperCase().slice(0, 4))
            .filter(Boolean),
        ),
      ].slice(0, 27);
    }
    return mapStructure(await getPrisma().clientStructure.update({ where: { id: cur.id }, data }));
  }

  async approveExecution(opportunityId: string, approver: string): Promise<unknown> {
    await getPrisma().opportunity.updateMany({
      where: { id: opportunityId, status: "pending_approval" },
      data: { status: "approved" },
    });
    return getPrisma().executionPlan.upsert({
      where: { opportunityId },
      update: { approved: true, approvedBy: approver, status: "approved" },
      create: {
        id: `exec-${opportunityId}`,
        opportunityId,
        title: "",
        approver,
        approved: true,
        approvedBy: approver,
        status: "approved",
        progress: 0,
        steps: [] as unknown as Prisma.InputJsonValue,
        audit: [] as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
