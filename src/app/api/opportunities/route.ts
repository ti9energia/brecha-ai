import type { NextRequest } from "next/server";
import { listOpportunities, opportunitiesSummary, type OppSort } from "@/server/domain/store";
import type { OpportunityType } from "@/server/domain/types";
import { ok } from "@/server/http";

// GET /api/opportunities — janelas ranqueadas + sumário de topo.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rows = listOpportunities({
    sector: sp.get("sector") ?? undefined,
    type: (sp.get("type") as OpportunityType) ?? undefined,
    sort: (sp.get("sort") as OppSort) ?? undefined,
    status: sp.get("status") === "all" ? "all" : undefined,
  });
  return ok(rows, { total: rows.length, summary: opportunitiesSummary() });
}
