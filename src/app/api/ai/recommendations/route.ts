import type { NextRequest } from "next/server";
import { getRepository } from "@/server/db/repository";
import { ok } from "@/server/http";
import { requireSession } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET /api/ai/recommendations — path canônico da spec 0A (alias de /agent/recommendations).
// Requer sessão válida (auth-gated).
export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, "ai-recs-read", { max: 60, windowMs: 60_000 });
  if (rl) return rl;
  const gate = await requireSession();
  if (gate.error) return gate.error;
  const rows = await getRepository().listAgentRecs();
  return ok(rows, { monitoring: 1247, total: rows.length });
}
