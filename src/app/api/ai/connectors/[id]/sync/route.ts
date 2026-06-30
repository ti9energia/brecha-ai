import { getConnector } from "@/server/ai-core";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// POST /api/ai/connectors/[id]/sync (0A §2.9) — dispara o sync de um connector
// (ingestão no RAG do tenant). manager+. Em produção, é um job agendado (0A §4).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, "ai-connector-sync", { max: 20, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("manager", "org_admin", "platform_owner");
  if (gate.error) return gate.error;

  const { id } = await ctx.params;
  const connector = getConnector(id);
  if (!connector) return fail("CONNECTOR_NOT_FOUND", "errors.not_found", 404);

  const result = await connector.sync(gate.session.orgId);
  return ok(result, { synced: true });
}
