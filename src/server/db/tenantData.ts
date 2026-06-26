// ─────────────────────────────────────────────────────────────────────────────
// Dados por tenant (multi-tenant — 00-PADRÃO §8). org-acme usa o store do demo; os
// demais tenants (ex.: ao impersonar) derivam uma estrutura própria do registro do
// Tenant, com estado mutável isolado. É o seam onde o isolamento por orgId vive — o
// PrismaRepository faz o mesmo via `where: { orgId }`. SWAP: Postgres por tenant.
// ─────────────────────────────────────────────────────────────────────────────
import { getStructure, updateStructure, listTenants } from "@/server/domain/store";
import type { ClientStructure } from "@/server/domain/types";

const DEFAULT_ORG = "org-acme";
const ORG_STRUCTURES: Record<string, ClientStructure> = {};

function synth(orgId: string): ClientStructure {
  const t = listTenants().find((x) => x.id === orgId);
  return {
    legalName: t?.name ?? orgId,
    taxId: "00.000.000/0001-00",
    regime: "Lucro Real",
    mainActivity: t?.sector ?? "industry",
    mainCnae: "00.00-0-00",
    activities: [],
    jurisdictions: ["SP"],
    headquarters: "São Paulo / SP",
    annualRevenue: (t?.mrr ?? 0) * 120,
    headcount: (t?.users ?? 1) * 50,
    entities: [],
    completeness: 0.6,
    lastReview: "2026-06-01",
  };
}

export function structureForOrg(orgId: string): ClientStructure {
  if (!orgId || orgId === DEFAULT_ORG) return getStructure();
  return (ORG_STRUCTURES[orgId] ??= synth(orgId));
}

export function updateStructureForOrg(orgId: string, patch: Record<string, unknown>): ClientStructure {
  if (!orgId || orgId === DEFAULT_ORG) return updateStructure(patch);
  const cur = (ORG_STRUCTURES[orgId] ??= synth(orgId));
  if (typeof patch.legalName === "string") cur.legalName = patch.legalName.slice(0, 200);
  if (typeof patch.regime === "string") cur.regime = patch.regime.slice(0, 120);
  if (typeof patch.mainActivity === "string") cur.mainActivity = patch.mainActivity.slice(0, 200);
  if (typeof patch.headquarters === "string") cur.headquarters = patch.headquarters.slice(0, 120);
  const rev = Number(patch.annualRevenue);
  if (Number.isFinite(rev) && rev >= 0) cur.annualRevenue = Math.min(rev, 1e15);
  const hc = Number(patch.headcount);
  if (Number.isFinite(hc) && hc >= 0) cur.headcount = Math.min(Math.round(hc), 1e9);
  if (Array.isArray(patch.jurisdictions)) {
    cur.jurisdictions = [
      ...new Set(
        (patch.jurisdictions as unknown[])
          .filter((j): j is string => typeof j === "string")
          .map((j) => j.trim().toUpperCase().slice(0, 4))
          .filter(Boolean),
      ),
    ].slice(0, 27);
  }
  return cur;
}
