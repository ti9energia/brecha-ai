import { getRepository } from "@/server/db/repository";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";
import { idempotencyKey, getIdempotent, setIdempotent } from "@/server/security/idempotency";

// POST /api/opportunities/:id/execute — aprovação humana (tributarista) + abre o
// plano. Mutação privilegiada: exige papel de aprovação e atribui o aprovador a
// partir da SESSÃO (nunca do corpo — senão a trilha de auditoria seria forjável).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, "execute", { max: 20, windowMs: 60_000 });
  if (limited) return limited;

  const { session, error } = await requireRole("manager", "org_admin", "platform_owner");
  if (error) return error;

  const { id } = await ctx.params;

  // Idempotência (00-PADRÃO §4): a mesma Idempotency-Key não re-executa a aprovação.
  // Backed pelo KVStore → seguro em lambdas serverless distintas (Onda 3).
  const idem = idempotencyKey(req);
  if (idem) {
    const cached = await getIdempotent(idem);
    if (cached) return ok(cached.data, { ...cached.meta, idempotent: true });
  }

  const repo = getRepository();
  const opp = await repo.getOpportunity(id);
  if (!opp) return fail("OPPORTUNITY_NOT_FOUND", "errors.not_found", 404);

  const plan = await repo.approveExecution(id, session.name);
  const data = { plan };
  const meta: Record<string, unknown> = { approvedBy: session.name };
  if (idem) await setIdempotent(idem, data, meta);
  return ok(data, meta);
}
