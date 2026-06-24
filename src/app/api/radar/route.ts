import type { NextRequest } from "next/server";
import { listRadar, opportunityForNorm } from "@/server/domain/store";
import { ok } from "@/server/http";

// GET /api/radar — fluxo de mudanças normativas relevantes.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rows = listRadar({
    level: sp.get("level") ?? undefined,
    sector: sp.get("sector") ?? undefined,
  }).map((n) => ({ ...n, opportunityId: opportunityForNorm(n.id)?.id ?? null }));
  return ok(rows, { total: rows.length });
}
