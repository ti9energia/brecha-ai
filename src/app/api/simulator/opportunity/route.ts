import { createOpportunityFromScenario } from "@/server/domain/store";
import type { ScenarioParams, ScenarioResult } from "@/server/domain/types";
import { ok, badRequest } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// POST /api/simulator/opportunity — cria uma Opportunity real a partir de um
// cenário simulado. Body: { params: ScenarioParams, result: ScenarioResult }
export async function POST(req: Request) {
  const limited = rateLimit(req, "simulator-opp", { max: 20, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("manager", "org_admin", "platform_staff", "platform_owner");
  if (gate.error) return gate.error;

  const body = await req.json().catch(() => null) as { params?: ScenarioParams; result?: ScenarioResult } | null;
  if (!body?.params || !body?.result) return badRequest("params e result obrigatórios");

  const opp = createOpportunityFromScenario(body.params, body.result);
  return ok(opp, { created: true });
}
