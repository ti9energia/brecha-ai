// Seed do Postgres a partir do MESMO conteúdo do demo (src/server/domain/seed.ts) —
// fonte única, sem divergência. Idempotente (upsert). Rode: `npm run db:seed`.
import { PrismaClient, Prisma } from "@prisma/client";
import {
  NORMS, OPPORTUNITIES, STRUCTURE, SAVINGS, EXECUTION_PLANS,
  TENANTS, PLANS, FEATURE_FLAGS, AUDIT_LOG,
} from "../src/server/domain/seed";

const prisma = new PrismaClient();
const json = (v: unknown) => v as Prisma.InputJsonValue;

async function main() {
  const orgId = "org-acme";
  await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: { id: orgId, name: STRUCTURE.legalName },
  });

  for (const n of NORMS) {
    await prisma.norm.upsert({
      where: { id: n.id },
      update: {},
      create: {
        id: n.id, level: n.level, jurisdiction: n.jurisdiction, title: n.title,
        summary: n.summary, body: n.body, source: json(n.source),
        publishedAt: new Date(n.publishedAt), effectiveDate: new Date(n.effectiveDate),
        relevance: n.relevance, sector: n.sector, tags: n.tags, matched: n.matched,
      },
    });
  }

  for (const o of OPPORTUNITIES) {
    await prisma.opportunity.upsert({
      where: { id: o.id },
      update: {},
      create: {
        id: o.id, normId: o.normId, type: o.type, title: o.title, summary: o.summary,
        sector: o.sector, estimatedGain: o.estimatedGain,
        windowStart: new Date(o.windowStart), windowEnd: new Date(o.windowEnd),
        effort: o.effort, confidence: o.confidence, status: o.status,
        correlatedNorms: o.correlatedNorms,
        recommendedMove: json(o.recommendedMove), simulation: json(o.simulation),
        createdAt: new Date(o.createdAt),
      },
    });
  }

  await prisma.clientStructure.upsert({
    where: { id: "struct-acme" },
    update: {},
    create: {
      id: "struct-acme", orgId, legalName: STRUCTURE.legalName, taxId: STRUCTURE.taxId,
      regime: STRUCTURE.regime, mainActivity: STRUCTURE.mainActivity, mainCnae: STRUCTURE.mainCnae,
      businessProfile: STRUCTURE.businessProfile,
      activities: json(STRUCTURE.activities), jurisdictions: STRUCTURE.jurisdictions,
      headquarters: STRUCTURE.headquarters, annualRevenue: STRUCTURE.annualRevenue,
      headcount: STRUCTURE.headcount, entities: json(STRUCTURE.entities),
      completeness: STRUCTURE.completeness, lastReview: STRUCTURE.lastReview,
    },
  });

  for (const r of SAVINGS.records) {
    await prisma.savingsRecord.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, opportunityId: r.opportunityId, playTitle: r.playTitle, type: r.type,
        realizedGain: r.realizedGain, quarter: r.quarter, reconciled: r.reconciled,
        capturedAt: new Date(r.capturedAt),
      },
    });
  }

  for (const p of EXECUTION_PLANS) {
    await prisma.executionPlan.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id, opportunityId: p.opportunityId, title: p.title, approver: p.approver,
        approved: p.approved, approvedBy: p.approvedBy ?? null, status: p.status,
        progress: p.progress, steps: json(p.steps), audit: json(p.audit),
      },
    });
  }

  for (const t of TENANTS) {
    await prisma.tenant.upsert({ where: { id: t.id }, update: {}, create: { ...t } });
  }

  for (const p of PLANS) {
    await prisma.plan.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id, name: p.name, tagline: p.tagline, price: p.price, period: p.period,
        popular: p.popular ?? false, feeRate: p.feeRate, features: p.features,
        entitlements: p.entitlements, quotas: json(p.quotas),
      },
    });
  }

  for (const f of FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({ where: { module: f.module }, update: {}, create: { ...f } });
  }

  for (const a of AUDIT_LOG) {
    await prisma.auditLog.upsert({
      where: { id: a.id },
      update: {},
      create: { id: a.id, at: new Date(a.at), actor: a.actor, tenant: a.tenant, action: a.action, detail: a.detail },
    });
  }

  console.log(`Seed OK: ${NORMS.length} normas · ${OPPORTUNITIES.length} oportunidades · ${TENANTS.length} tenants · ${PLANS.length} planos.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
