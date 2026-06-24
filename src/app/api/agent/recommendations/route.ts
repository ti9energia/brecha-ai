import { listAgentRecs } from "@/server/domain/store";
import { ok } from "@/server/http";

// GET /api/agent/recommendations — fila do Agente Autônomo (0A §4).
export async function GET() {
  const rows = listAgentRecs();
  return ok(rows, { monitoring: 1247, total: rows.length });
}
