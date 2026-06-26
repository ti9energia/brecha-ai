import type { NextRequest } from "next/server";
import type { OpportunityType } from "@/server/domain/types";
import type { OppSort } from "@/server/domain/store";
import { getRepository } from "@/server/db/repository";
import { ok } from "@/server/http";

const SORTS: OppSort[] = ["gain", "deadline", "confidence"];
const TYPES: OpportunityType[] = ["regime", "incentive", "jurisdiction", "classification", "credit"];

// GET /api/opportunities — janelas ranqueadas + sumário de topo. Lê pelo seam de
// persistência (Postgres se DATABASE_URL; senão o seed in-memory).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sortP = sp.get("sort");
  const typeP = sp.get("type");
  const repo = getRepository();
  const rows = await repo.listOpportunities({
    sector: sp.get("sector")?.slice(0, 40) ?? undefined,
    type: TYPES.includes(typeP as OpportunityType) ? (typeP as OpportunityType) : undefined,
    sort: SORTS.includes(sortP as OppSort) ? (sortP as OppSort) : undefined,
    status: sp.get("status") === "all" ? "all" : undefined,
  });
  return ok(rows, { total: rows.length, summary: await repo.opportunitiesSummary() });
}
