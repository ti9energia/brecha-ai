import { listInvoices, billingSummary, generateInvoice } from "@/server/domain/store";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET/POST /api/owner/billing (0C §2.7) — faturas + sumário; POST gera nova fatura.
export async function GET() {
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;
  return ok(listInvoices(), { summary: billingSummary() });
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, "owner-billing", { max: 30, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;

  const body = await req.json().catch(() => ({}));
  const tenantId = body && typeof body === "object" ? (body as Record<string, unknown>).tenantId : undefined;
  if (typeof tenantId !== "string") return fail("MISSING_TENANT", "errors.missing_params");
  const inv = generateInvoice(tenantId);
  if (!inv) return fail("TENANT_NOT_FOUND", "errors.not_found", 404);
  return ok(inv, { generated: true });
}
