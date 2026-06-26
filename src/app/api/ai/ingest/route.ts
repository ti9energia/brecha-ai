import { cookies } from "next/headers";
import { ingestDocument } from "@/server/ai-core";
import { ok, fail } from "@/server/http";
import { verifySession, SESSION_COOKIE } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rateLimit";

// POST /api/ai/ingest (0A §2.9) — ingere um documento no índice de conhecimento
// (RAG) do tenant. Requer sessão; isolado por orgId. O conteúdo passa a ser
// recuperável pelo copiloto/agente/WhatsApp daquele tenant.
export async function POST(req: Request) {
  const limited = rateLimit(req, "ai-ingest", { max: 30, windowMs: 60_000 });
  if (limited) return limited;
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return fail("UNAUTHENTICATED", "auth.unauthenticated", 401);

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
