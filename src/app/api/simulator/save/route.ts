import { saveScenario } from "@/server/domain/store";
import type { ScenarioParams, ScenarioResult } from "@/server/domain/types";
import { ok, badRequest } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// POST /api/simulator/save — persiste um cenário criado pelo simulador.
// Body: { name: string, params: ScenarioParams, result: ScenarioResult }
export async function POST(req: Request) {
  const limited = rateLimit(req, "simulator-save", { max: 30, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("member", "tributarista", "manager", "org_admin", "platform_staff", "platform_owner");
  if (gate.error) return gate.error;

  const body = await req.json().catch(() => null) as { name?: string; params?: ScenarioParams; result?: ScenarioResult } | null;
  if (!body?.params || !body?.result) return badRequest("params e result obrigatórios");

  const saved = saveScenario(
    (body.name ?? "Cenário").slice(0, 80),
    body.params,
    body.result,
  );
  return ok(saved, { saved: true });
}
