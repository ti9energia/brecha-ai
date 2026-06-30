import { updateUser } from "@/server/auth/users";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// PATCH /api/owner/users/[id] — atualizar papel, bloquear/desbloquear (0C §2.3).
// platform_owner only; nunca permite alterar o próprio dono para auto-rebaixamento.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "owner-users-write", { max: 20, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const patch: { role?: Parameters<typeof updateUser>[1]["role"]; blocked?: boolean; name?: string } = {};
  if (typeof body.role === "string") patch.role = body.role as Parameters<typeof updateUser>[1]["role"];
  if (typeof body.blocked === "boolean") patch.blocked = body.blocked;
  if (typeof body.name === "string") patch.name = body.name;

  const updated = updateUser(id, patch);
  if (!updated) return fail("USER_NOT_FOUND", "errors.not_found", 404);
  return ok(updated, { updated: true });
}
