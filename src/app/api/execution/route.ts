import { listExecutionPlans, listOpportunities } from "@/server/domain/store";
import { ok } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET /api/execution — planos de execução ativos + todas as oportunidades
// (para lookup de título na view de execução).
export async function GET(req: Request) {
  const limited = rateLimit(req, "execution-read", { max: 120, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("member", "tributarista", "manager", "org_admin", "platform_staff", "platform_owner");
  if (gate.error) return gate.error;
  const plans = listExecutionPlans();
  const opportunities = listOpportunities({ status: "all" });
  return ok({ plans, opportunities });
}
