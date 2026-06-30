import type { NextRequest } from "next/server";
import { getRepository } from "@/server/db/repository";
import { ok } from "@/server/http";
import { rateLimit } from "@/server/security/rateLimit";

// GET /api/agent/recommendations — fila do Agente Autônomo (0A §4).
// Passado pelo seam do repositório (0D §2) — sem DATABASE_URL usa in-memory.
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, "agent-recs-read", { max: 60, windowMs: 60_000 });
  if (rl) return rl;
  const rows = await getRepository().listAgentRecs();
  return ok(rows, { monitoring: 1247, total: rows.length });
}
