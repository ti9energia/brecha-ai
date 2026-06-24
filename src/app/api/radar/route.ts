import type { NextRequest } from "next/server";
import { listRadar, opportunityForNorm } from "@/server/domain/store";
import { ok } from "@/server/http";

const LEVELS = ["federal", "state", "municipal"];

// GET /api/radar — fluxo de mudanças normativas relevantes.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const levelP = sp.get("level");
  const rows = listRadar({
    level: LEVELS.includes(levelP ?? "") ? levelP! : undefined,
    sector: sp.get("sector")?.slice(0, 40) ?? undefined,
  }).map((n) => ({ ...n, opportunityId: opportunityForNorm(n.id)?.id ?? null }));
  return ok(rows, { total: rows.length });
}
