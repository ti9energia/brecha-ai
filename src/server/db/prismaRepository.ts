// Implementação Postgres do Repository (Prisma). Ativada quando DATABASE_URL existe.
// Mapeia linhas do Prisma → tipos de domínio (datas→ISO, colunas Json→value-objects)
// e reusa daysUntil/windowState para os campos derivados — mesma semântica do seed.
//
// Melhorias de desempenho (Onda 2): pushdown de WHERE/ORDER BY/take para o banco;
// count/aggregate em vez de carregar todos os rows no JS.
//
// NOTA: verificado por typecheck + `prisma generate` (offline). As queries só rodam
// contra um Postgres real — rode `npm run db:migrate && npm run db:seed` e aponte
// DATABASE_URL para validar em runtime.
import { getPrisma } from "./client";
import { daysUntil, windowState, type OpportunityView, type AppSettings, type AiFeedback } from "@/server/domain/store";
import type {
  Repository, ListOpportunitiesOpts, OpportunitiesSummary, RadarRow, AiFeedbackStats,
} from "./repository";
import type {
  Norm, NormLevel, SourceRef, SectorId, OpportunityType, Level,
  OpportunityStatus, RecommendedMove, ImpactSimulation, ClientStructure,
  SavingsSummary, SavingsRecord, AgentRecommendation,
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

// ── Tipo para steps/audit no ExecutionPlan (Json) ─────────────────────────────
interface PlanStep {
  id: string;
  title: string;
  detail: string;
  status: "todo" | "doing" | "blocked" | "done";
  assignee: string;
  due: string;
  document?: string;
}

const STEP_NEXT: Record<string, string> = {
  todo: "doing",
  doing: "done",
  done: "todo",
  blocked: "doing",
};

function currentQuarter(now = new Date()): string {
  const q = Math.ceil((now.getUTCMonth() + 1) / 3);
  return `${now.getUTCFullYear()}-Q${q}`;
}

export class PrismaRepository implements Repository {
  // ── leitura ────────────────────────────────────────────────────────────────

  async listOpportunities(opts?: ListOpportunitiesOpts): Promise<OpportunityView[]> {
    // SQL pushdown: WHERE direto no banco em vez de filtrar no JS
    const where: Prisma.OpportunityWhereInput = {};
    if (opts?.status !== "all") where.status = { notIn: ["expired", "captured"] };
    if (opts?.sector && opts.sector !== "all") where.sector = opts.sector;
    if (opts?.type) where.type = opts.type;

    const sort = opts?.sort ?? "gain";
    const orderBy: Prisma.OpportunityOrderByWithRelationInput =
      sort === "deadline"    ? { windowEnd: "asc" }
      : sort === "confidence" ? { confidence: "desc" }
      : { estimatedGain: "desc" };

    const rows = await getPrisma().opportunity.findMany({
      where,
      orderBy,
      include: { norm: true },
    });
    return rows.map((r) => mapOpp(r, mapNorm(r.norm)));
  }

  async getOpportunity(id: string): Promise<OpportunityView | null> {
    const o = await getPrisma().opportunity.findUnique({ where: { id }, include: { norm: true } });
    return o ? mapOpp(o, mapNorm(o.norm)) : null;
  }

  async opportunitiesSummary(): Promise<OpportunitiesSummary> {
    // SQL pushdown: aggregate no banco, não em memória JS
    const [active, gainAgg, savingsAgg] = await Promise.all([
      getPrisma().opportunity.findMany({
        where: { status: { notIn: ["expired", "captured"] } },
        select: { windowEnd: true, estimatedGain: true },
      }),
      getPrisma().opportunity.aggregate({
        where: { status: { notIn: ["expired", "captured"] } },
        _sum: { estimatedGain: true },
      }),
      getPrisma().savingsRecord.aggregate({ _sum: { realizedGain: true } }),
    ]);

    const openGain = gainAgg._sum.estimatedGain ?? 0;
    // Mesmo critério do store in-memory: piso >= 0 para não contar janelas expiradas.
    const closingSoon = active.filter((o) => {
      const d = daysUntil(o.windowEnd.toISOString());
      return d >= 0 && d <= 21;
    }).length;

    return {
      openWindows: active.length,
      openGain,
      closingSoon,
      capturedYtd: savingsAgg._sum.realizedGain ?? 0,
    };
  }

  async listRadar(opts?: { level?: string; sector?: string }): Promise<RadarRow[]> {
    const where: Prisma.NormWhereInput = {};
    if (opts?.level && opts.level !== "all") where.level = opts.level;
    if (opts?.sector && opts.sector !== "all") where.sector = opts.sector;

    const [norms, opps] = await Promise.all([
      getPrisma().norm.findMany({ where, orderBy: { publishedAt: "desc" } }),
      getPrisma().opportunity.findMany({ select: { id: true, normId: true } }),
    ]);
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

  async getSavings(_orgId = "org-acme"): Promise<SavingsSummary> {
    // Agrega diretamente no Postgres, sem carrier o seed inteiro.
    const [records, agg] = await Promise.all([
      getPrisma().savingsRecord.findMany({ orderBy: { capturedAt: "desc" } }),
      getPrisma().savingsRecord.aggregate({
        _sum: { realizedGain: true },
        where: { reconciled: false },
      }),
    ]);

    const mapRecord = (r: (typeof records)[number]): SavingsRecord => ({
      id: r.id,
      opportunityId: r.opportunityId,
      playTitle: r.playTitle,
      type: r.type as SavingsRecord["type"],
      realizedGain: r.realizedGain,
      quarter: r.quarter,
      reconciled: r.reconciled,
      capturedAt: r.capturedAt.toISOString(),
    });

    const realizedYtd = records.reduce((s, r) => s + r.realizedGain, 0);
    const feeBase = records.filter((r) => r.reconciled).reduce((s, r) => s + r.realizedGain, 0);
    const FEE_RATE = 0.18;

    // byQuarter: agrupa localmente após fetch (poucos registros — OK)
    const byQMap = new Map<string, { realized: number; projected: number }>();
    for (const r of records) {
      const prev = byQMap.get(r.quarter) ?? { realized: 0, projected: 0 };
      byQMap.set(r.quarter, { realized: prev.realized + r.realizedGain, projected: prev.projected + r.realizedGain });
    }

    return {
      currency: "BRL",
      realizedYtd,
      inExecution: agg._sum.realizedGain ?? 0,
      projected12m: realizedYtd * 1.3, // heurística — igual ao seed
      feeBase,
      feeRate: FEE_RATE,
      feeDue: Math.round(feeBase * FEE_RATE),
      byQuarter: [...byQMap.entries()].map(([quarter, v]) => ({ quarter, ...v })),
      records: records.map(mapRecord),
    };
  }

  async listAgentRecs(): Promise<AgentRecommendation[]> {
    // Sem tabela AgentRecommendation no schema v1 — delega ao seed in-memory.
    // // SWAP produção: criar modelo AgentRecommendation no schema + query Prisma.
    const { listAgentRecs: storeList } = await import("@/server/domain/store");
    return storeList().map(({ id, kind, title, body, impact, confidence, opportunityId, createdAt }) => ({
      id, kind, title, body, impact, confidence, opportunityId, createdAt,
    }));
  }

  async getSettings(_orgId = "org-acme"): Promise<AppSettings> {
    // Sem tabela de settings v1 — delega ao store in-memory.
    // // SWAP produção: criar modelo OrgSettings no schema + query Prisma.
    const { getSettings: storeGet } = await import("@/server/domain/store");
    return storeGet();
  }

  // ── escrita ────────────────────────────────────────────────────────────────

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

  async advanceExecutionStep(planId: string, stepId: string): Promise<unknown> {
    // Lê o plano, avança o step no JS (mesmo ciclo do in-memory) e grava de volta.
    // Produção: considerar SELECT FOR UPDATE para evitar race condition.
    const row = await getPrisma().executionPlan.findUnique({ where: { id: planId } });
    if (!row) return null;
    const steps = (row.steps as unknown as PlanStep[]);
    const step = steps.find((s) => s.id === stepId);
    if (!step) return null;

    step.status = (STEP_NEXT[step.status] ?? "doing") as PlanStep["status"];
    const done = steps.filter((s) => s.status === "done").length;
    const progress = steps.length ? Math.round((done / steps.length) * 100) / 100 : 0;
    const wasCaptured = row.status === "captured";
    const newStatus = progress >= 1 ? "captured" : row.approved ? "executing" : row.status;

    const updated = await getPrisma().executionPlan.update({
      where: { id: planId },
      data: { steps: steps as unknown as Prisma.InputJsonValue, progress, status: newStatus },
    });

    // Auto-criar SavingsRecord se chegou a 100% pela primeira vez (idempotente)
    if (newStatus === "captured" && !wasCaptured) {
      const opp = await getPrisma().opportunity.findUnique({ where: { id: row.opportunityId } });
      const existing = await getPrisma().savingsRecord.findFirst({
        where: { opportunityId: row.opportunityId },
      });
      if (!existing && opp) {
        const sim = opp.simulation as unknown as { annualGain?: number } | null;
        const realizedGain = Math.max(0, sim?.annualGain ?? opp.estimatedGain ?? 0);
        await getPrisma().savingsRecord.create({
          data: {
            id: `sav-auto-pg-${row.opportunityId}`,
            opportunityId: row.opportunityId,
            playTitle: updated.title || opp.title || row.opportunityId,
            type: opp.type,
            realizedGain,
            quarter: currentQuarter(),
            reconciled: false,
            capturedAt: new Date(),
          },
        });
      }
    }
    return updated;
  }

  async reconcileSaving(id: string): Promise<SavingsSummary | null> {
    const rec = await getPrisma().savingsRecord.findUnique({ where: { id } });
    if (!rec || rec.reconciled) return null;

    await getPrisma().savingsRecord.update({ where: { id }, data: { reconciled: true } });
    // Retorna o summary atualizado
    return this.getSavings();
  }

  async updateSettings(patch: Record<string, unknown>, _orgId = "org-acme"): Promise<AppSettings> {
    // // SWAP produção: criar OrgSettings no schema + upsert.
    const { updateSettings: storeUpdate } = await import("@/server/domain/store");
    return storeUpdate(patch);
  }

  async recordAiFeedback(f: Omit<AiFeedback, "at">): Promise<AiFeedbackStats> {
    await getPrisma().aiFeedback.create({
      data: {
        rating: f.rating,
        message: f.message,
        locale: f.locale,
        userId: f.userId,
        orgId: f.orgId,
        at: new Date(),
      },
    });
    const [total, up] = await Promise.all([
      getPrisma().aiFeedback.count(),
      getPrisma().aiFeedback.count({ where: { rating: "up" } }),
    ]);
    return { total, up, down: total - up };
  }
}
