import { approveExecution, getOpportunity } from "@/server/domain/store";
import { ok, fail } from "@/server/http";

// POST /api/opportunities/:id/execute — aprovação humana (tributarista) + abre o plano.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const opp = getOpportunity(id);
  if (!opp) return fail("OPPORTUNITY_NOT_FOUND", "errors.not_found", 404);

  let approver = "Helena Vasconcelos";
  try {
    const body = await req.json();
    if (body?.approver) approver = String(body.approver);
  } catch {
    /* corpo opcional */
  }

  const plan = approveExecution(id, approver);
  return ok({ plan }, { approvedBy: approver });
}
