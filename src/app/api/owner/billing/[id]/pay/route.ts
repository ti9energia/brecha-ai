import { markInvoicePaid } from "@/server/domain/store";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// POST /api/owner/billing/[id]/pay (0C §2.7) — concilia/baixa uma fatura. platform_owner.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, "owner-billing-pay", { max: 30, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;

  const { id } = await ctx.params;
  const inv = markInvoicePaid(id);
  if (!inv) return fail("INVOICE_NOT_FOUND", "errors.not_found", 404);
  return ok(inv, { paid: true });
}
