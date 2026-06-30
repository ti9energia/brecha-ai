import { NextResponse } from "next/server";
import { listTenants } from "@/server/domain/store";
import { signSession, SESSION_COOKIE, cookieOptions } from "@/server/auth/session";
import { fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// POST /api/owner/tenants/[id]/impersonate (0C §2.2) — platform_owner assume a sessão
// de um tenant: re-emite o cookie com orgId do tenant e `imp` = sub do dono (para
// poder encerrar). O workspace recarrega operando como o tenant.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, "impersonate", { max: 20, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;

  const { id } = await ctx.params;
  const tenant = listTenants().find((t) => t.id === id);
  if (!tenant) return fail("TENANT_NOT_FOUND", "errors.not_found", 404);

  const token = await signSession({
    sub: `imp-${tenant.id}`,
    email: `owner+${tenant.id}@brecha.ai`,
    name: tenant.name,
    role: "manager",
    orgId: tenant.id,
    imp: gate.session.sub,
  });
  const res = NextResponse.json({ data: { tenant: tenant.name }, meta: { impersonating: true }, error: null });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions);
  return res;
}
