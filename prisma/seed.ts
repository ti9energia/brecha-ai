// Seed do Postgres a partir do MESMO conteúdo do demo (src/server/domain/seed.ts) —
// fonte única, sem divergência. Idempotente (upsert). Rode: `npm run db:seed`.
import { PrismaClient, Prisma } from "@prisma/client";
import {
  NORMS, OPPORTUNITIES, STRUCTURE, SAVINGS, EXECUTION_PLANS,
  TENANTS, PLANS, FEATURE_FLAGS, AUDIT_LOG,
} from "../src/server/domain/seed";

const prisma = new PrismaClient();
const json = (v: unknown) => v as Prisma.InputJsonValue;

// Usuários demo — mesmos do src/server/auth/users.ts (senha "demo1234" para todos).
// passwordHash = sha256("<email>:<senha>") — mantido em sync com o auth store.
const SEED_USERS = [
  { id: "u-marina", email: "marina.alves@acme.com.br", name: "Marina Alves", role: "manager", orgId: "org-acme", passwordHash: "1852467bdc8d4e2c60a53ddfdc0731bfeec4483b3db2e511667375490df343a4" },
  { id: "u-helena", email: "helena.v@acme.com.br", name: "Helena Vasconcelos", role: "manager", orgId: "org-acme", passwordHash: "c8636599e4b7aa02f25b41b94a7403af89910da8afa085aed398856f3cdf8509" },
  { id: "u-rafael", email: "rafael.lima@acme.com.br", name: "Rafael Lima", role: "member", orgId: "org-acme", passwordHash: "836921278d450fee20a646638e51aa01d62ceb5eb253b5b0f6117fa1eceb1344" },
  { id: "u-silva", email: "dra.silva@silvaadvogados.com.br", name: "Dra. Beatriz Silva", role: "manager", orgId: "org-silva-adv", passwordHash: "83f7c47e9d5c1ada6963be1c3ded8c6e2da2db1f0d0749c3c034deced07b63a1" },
  { id: "u-owner", email: "owner@brecha.ai", name: "Dono da Plataforma", role: "platform_owner", orgId: "org-acme", passwordHash: "5501168e9c82fc127afe9c673cd5184d2be1e117ad286c5d5dd9b1db88f694f2" },
];

async function main() {
  // ── Organizations ────────────────────────────────────────────────────────────
  await prisma.organization.upsert({
    where: { id: "org-acme" },
    update: {},
    create: { id: "org-acme", name: STRUCTURE.legalName },
  });
  // Org do escritório (perfil "firm") — necessária para FK de User e AiFeedback.
  await prisma.organization.upsert({
    where: { id: "org-silva-adv" },
    update: {},
    create: { id: "org-silva-adv", name: "Silva Advogados Tributaristas" },
  });

  // ── Normas ───────────────────────────────────────────────────────────────────
  for (const n of NORMS) {
    await prisma.norm.upsert({
      where: { id: n.id },
      update: {},
      create: {
        id: n.id, level: n.level, jurisdiction: n.jurisdiction, title: n.title,
        summary: n.summary, body: n.body, source: json(n.source),
        publishedAt: new Date(n.publishedAt), effectiveDate: new Date(n.effectiveDate),
        relevance: n.relevance, sector: n.sector, tags: n.tags, matched: n.matched,
        // Embedding placeholder (Onda 3: pgvector). Vazio no seed — preenchido pelo job de ingestão.
        embedding: [],
      },
    });
  }

  // ── Oportunidades ─────────────────────────────────────────────────────────────
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

  // ── ClientStructure ───────────────────────────────────────────────────────────
  await prisma.clientStructure.upsert({
    where: { id: "struct-acme" },
    update: {},
    create: {
      id: "struct-acme", orgId: "org-acme", legalName: STRUCTURE.legalName, taxId: STRUCTURE.taxId,
      regime: STRUCTURE.regime, mainActivity: STRUCTURE.mainActivity, mainCnae: STRUCTURE.mainCnae,
      businessProfile: STRUCTURE.businessProfile,
      activities: json(STRUCTURE.activities), jurisdictions: STRUCTURE.jurisdictions,
      headquarters: STRUCTURE.headquarters, annualRevenue: STRUCTURE.annualRevenue,
      headcount: STRUCTURE.headcount, entities: json(STRUCTURE.entities),
      completeness: STRUCTURE.completeness, lastReview: STRUCTURE.lastReview,
    },
  });

  // ── Savings records ───────────────────────────────────────────────────────────
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

  // ── Execution plans ───────────────────────────────────────────────────────────
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

  // ── Tenants ───────────────────────────────────────────────────────────────────
  for (const t of TENANTS) {
    await prisma.tenant.upsert({ where: { id: t.id }, update: {}, create: { ...t } });
  }

  // ── Plans (inclui planType — drift corrigido) ─────────────────────────────────
  for (const p of PLANS) {
    await prisma.plan.upsert({
      where: { id: p.id },
      update: { planType: p.planType }, // garante consistência em re-seeds
      create: {
        id: p.id, planType: p.planType, name: p.name, tagline: p.tagline,
        price: p.price, period: p.period, popular: p.popular ?? false,
        feeRate: p.feeRate, features: p.features, entitlements: p.entitlements,
        quotas: json(p.quotas),
      },
    });
  }

  // ── Feature flags ─────────────────────────────────────────────────────────────
  for (const f of FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({ where: { module: f.module }, update: {}, create: { ...f } });
  }

  // ── Audit log (seed inicial) ──────────────────────────────────────────────────
  for (const a of AUDIT_LOG) {
    await prisma.auditLog.upsert({
      where: { id: a.id },
      update: {},
      create: { id: a.id, at: new Date(a.at), actor: a.actor, tenant: a.tenant, action: a.action, detail: a.detail },
    });
  }

  // ── Users (seeding: hashes das contas demo) ───────────────────────────────────
  for (const u of SEED_USERS) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: { id: u.id, email: u.email, name: u.name, role: u.role, orgId: u.orgId, passwordHash: u.passwordHash },
    });
  }

  // ── AiFeedback — seed mínimo para o painel não começar zerado ─────────────────
  const SEED_FEEDBACK = [
    { id: "fb-seed-1", rating: "up", message: "", locale: "pt-BR", userId: "u-marina", orgId: "org-acme", at: new Date("2026-06-20T12:00:00Z") },
    { id: "fb-seed-2", rating: "up", message: "", locale: "pt-BR", userId: "u-helena", orgId: "org-acme", at: new Date("2026-06-21T10:00:00Z") },
    { id: "fb-seed-3", rating: "down", message: "Muito técnico", locale: "pt-BR", userId: "u-rafael", orgId: "org-acme", at: new Date("2026-06-22T08:00:00Z") },
  ] as const;
  for (const fb of SEED_FEEDBACK) {
    await prisma.aiFeedback.upsert({
      where: { id: fb.id },
      update: {},
      create: { ...fb },
    });
  }

  console.log(
    `Seed OK: ${NORMS.length} normas · ${OPPORTUNITIES.length} oportunidades · ${TENANTS.length} tenants · ${PLANS.length} planos · ${SEED_USERS.length} usuários.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
