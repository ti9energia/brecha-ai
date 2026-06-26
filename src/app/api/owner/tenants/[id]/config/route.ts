import { getTenantConfig, updateTenantConfig, listTenants } from "@/server/domain/store";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET/PUT /api/owner/tenants/[id]/config (0C §2.8/2.9) — config de IA/WhatsApp por
// tenant. platform_owner.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;
  const { id } = await ctx.params;
  if (!listTenants().some((t) => t.id === id)) return fail("TENANT_NOT_FOUND", "errors.not_found", 404);
  return ok(getTenantConfig(id));
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, "owner-config", { max: 30, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;

  const { id } = await ctx.params;
  if (!listTenants().some((t) => t.id === id)) return fail("TENANT_NOT_FOUND", "errors.not_found", 404);
  const patch = await req.json().catch(() => ({}));
  const saved = updateTenantConfig(id, patch && typeof patch === "object" ? (patch as Record<string, unknown>) : {});
  return ok(saved, { saved: true });
}
