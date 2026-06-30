import { getFirmClient, clientBrechas } from "@/server/domain/store";
import { ok, notFound } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET /api/clients/[id] — detalhe do cliente + brechas detectadas para ele.
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const limited = await rateLimit(req, "client-detail", { max: 120, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("tributarista", "manager", "org_admin", "platform_staff", "platform_owner");
  if (gate.error) return gate.error;
  const { id } = await ctx.params;
  const client = getFirmClient(id);
  if (!client) return notFound("Cliente não encontrado");
  const brechas = clientBrechas(id);
  return ok({ client, brechas });
}
