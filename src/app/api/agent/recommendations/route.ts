import type { NextRequest } from "next/server";
import { listAgentRecs } from "@/server/domain/store";
import { ok } from "@/server/http";
import { rateLimit } from "@/server/security/rateLimit";

// GET /api/agent/recommendations — fila do Agente Autônomo (0A §4).
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, "agent-recs-read", { max: 60, windowMs: 60_000 });
  if (rl) return rl;
  const rows = listAgentRecs();
  return ok(rows, { monitoring: 1247, total: rows.length });
}
