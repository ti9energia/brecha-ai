import { ingestDocument } from "@/server/ai-core";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// POST /api/ai/ingest (0A §2.9) — ingere um documento no índice de conhecimento
// (RAG) do tenant. Escrita no conhecimento = manager+ (espelha connectors/sync):
// o RAG alimenta copiloto/agente/WhatsApp de TODO o tenant, então um viewer/member
// não pode injetar conteúdo (evita RAG poisoning). Isolado por orgId.
export async function POST(req: Request) {
  const limited = rateLimit(req, "ai-ingest", { max: 30, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("manager", "org_admin", "platform_owner");
  if (gate.error) return gate.error;
  const session = gate.session;

  let body: { title?: unknown; text?: unknown; ref?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_BODY", "errors.invalid_body");
  }
  const title = typeof body?.title === "string" ? body.title.slice(0, 300) : "";
  const text = typeof body?.text === "string" ? body.text.slice(0, 8000) : "";
  if (!title && !text) return fail("MISSING_PARAMS", "errors.missing_params");
  const ref = typeof body?.ref === "string" ? body.ref.slice(0, 200) : undefined;

  const chunk = ingestDocument(session.orgId, { title, text, ref });
  return ok({ id: chunk.id, ingested: 1 }, { ingested: true });
}
