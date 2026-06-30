import { getRepository } from "@/server/db/repository";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// POST /api/savings/reconcile — concilia um registro de economia para entrar na base
// do success fee (08 §7). Ação financeira: exige papel de aprovação (manager+), igual
// à aprovação de execução. Idempotente: já conciliado / inexistente → 404.
// Passado pelo seam do repositório (0D §2) — sem DATABASE_URL usa in-memory.
export async function POST(req: Request) {
  const limited = rateLimit(req, "reconcile", { max: 20, windowMs: 60_000 });
  if (limited) return limited;

  const gate = await requireRole("manager", "org_admin", "platform_owner");
  if (gate.error) return gate.error;

  const body = await req.json().catch(() => ({}));
  const id = body && typeof body === "object" ? String((body as { id?: unknown }).id ?? "") : "";
  const summary = await getRepository().reconcileSaving(id);
  if (!summary) return fail("RECONCILE_FAILED", "errors.not_found", 404);
  return ok(summary, { reconciled: id });
}
