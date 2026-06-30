import { approveExecution } from "@/server/domain/store";
import { ok, notFound, badRequest } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// POST /api/execution/[id]/approve — aprovar o plano de execução.
// Restrito a manager+ (espelha a tool execution:approve em tools.ts).
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const limited = await rateLimit(req, "execution-approve", { max: 30, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("tributarista", "manager", "org_admin", "platform_staff", "platform_owner");
  if (gate.error) return gate.error;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({})) as { approver?: string };
  const approver = (body?.approver ?? gate.session.name ?? "").slice(0, 80).trim();
  if (!approver) return badRequest("approver obrigatório");

  const plan = approveExecution(id, approver);
  if (!plan) return notFound("Plano não encontrado");
  return ok(plan, { approved: true });
}
