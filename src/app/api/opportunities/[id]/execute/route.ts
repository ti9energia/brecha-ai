import { approveExecution, getOpportunity } from "@/server/domain/store";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// POST /api/opportunities/:id/execute — aprovação humana (tributarista) + abre o
// plano. Mutação privilegiada: exige papel de aprovação e atribui o aprovador a
// partir da SESSÃO (nunca do corpo — senão a trilha de auditoria seria forjável).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "execute", { max: 20, windowMs: 60_000 });
  if (limited) return limited;

  const { session, error } = await requireRole("manager", "org_admin", "platform_owner");
  if (error) return error;

  const { id } = await ctx.params;
  const opp = getOpportunity(id);
  if (!opp) return fail("OPPORTUNITY_NOT_FOUND", "errors.not_found", 404);

  const plan = approveExecution(id, session.name);
  return ok({ plan }, { approvedBy: session.name });
}
