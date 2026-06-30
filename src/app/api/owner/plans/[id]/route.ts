import { updatePlan } from "@/server/domain/store";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// PUT /api/owner/plans/[id] — editar preço/fee/entitlements (0C §2.4). platform_owner only.
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, "owner-plan", { max: 30, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;

  const { id } = await ctx.params;
  const patch = await req.json().catch(() => ({}));
  const updated = updatePlan(id, patch && typeof patch === "object" ? (patch as Record<string, unknown>) : {});
  if (!updated) return fail("PLAN_NOT_FOUND", "errors.not_found", 404);
  return ok(updated, { updated: true });
}
