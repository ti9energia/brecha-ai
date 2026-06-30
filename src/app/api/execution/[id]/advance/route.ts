import { advanceExecutionStep } from "@/server/domain/store";
import { ok, notFound, badRequest } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// POST /api/execution/[id]/advance — avança um passo do plano.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(req, "execution-advance", { max: 60, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("member", "tributarista", "manager", "org_admin", "platform_staff", "platform_owner");
  if (gate.error) return gate.error;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({})) as { stepId?: string };
  const stepId = (body?.stepId ?? "").trim();
  if (!stepId) return badRequest("stepId obrigatório");

  const plan = advanceExecutionStep(id, stepId);
  if (!plan) return notFound("Plano ou passo não encontrado");
  return ok(plan, { advanced: true });
}
