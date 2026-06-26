import { listTenants, createTenant } from "@/server/domain/store";
import type { SectorId } from "@/server/domain/types";
import { ok } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET/POST /api/owner/tenants (0C §2.2/§8). platform_owner only (middleware + handler).
export async function GET() {
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;
  return ok(listTenants());
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "owner-tenants", { max: 30, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;

  const body = await req.json().catch(() => ({}));
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const created = createTenant({
    name: typeof b.name === "string" ? b.name : undefined,
    plan: typeof b.plan === "string" ? b.plan : undefined,
    locale: typeof b.locale === "string" ? b.locale : undefined,
    sector: typeof b.sector === "string" ? (b.sector as SectorId) : undefined,
  });
  return ok(created, { created: true });
}
