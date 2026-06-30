import { setTenantStatus } from "@/server/domain/store";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// PATCH /api/owner/tenants/[id] — suspender/reativar (0C §2.2). platform_owner only.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, "owner-tenant", { max: 30, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const status = body && typeof body === "object" ? (body as Record<string, unknown>).status : undefined;
  if (typeof status !== "string") return fail("MISSING_STATUS", "errors.missing_params");
  const updated = setTenantStatus(id, status);
  if (!updated) return fail("TENANT_NOT_FOUND", "errors.not_found", 404);
  return ok(updated, { updated: true });
}
