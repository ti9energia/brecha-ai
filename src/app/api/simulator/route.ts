import { runScenario, listScenarios } from "@/server/domain/store";
import type { ScenarioParams } from "@/server/domain/types";
import { ok, fail } from "@/server/http";
import { rateLimit } from "@/server/security/rateLimit";

export async function GET() {
  return ok(listScenarios());
}

// POST /api/simulator — roda o motor fiscal sobre os parâmetros do cenário.
export async function POST(req: Request) {
  const limited = rateLimit(req, "simulator", { max: 60, windowMs: 60_000 });
  if (limited) return limited;

  let params: Partial<ScenarioParams>;
  try {
    params = await req.json();
  } catch {
    return fail("INVALID_BODY", "errors.invalid_body");
  }
  const revenue = Number(params?.revenue);
  if (
    typeof params?.regime !== "string" ||
    typeof params?.jurisdiction !== "string" ||
    !Number.isFinite(revenue) ||
    revenue < 0
  ) {
    return fail("MISSING_PARAMS", "errors.missing_params");
  }
  const result = runScenario({
    regime: params.regime.slice(0, 120),
    jurisdiction: params.jurisdiction.slice(0, 120),
    classification: (params.classification ?? "Indústria metalúrgica").slice(0, 120),
    revenue: Math.min(revenue, 1e15), // teto sanitário
  });
  return ok(result);
}
