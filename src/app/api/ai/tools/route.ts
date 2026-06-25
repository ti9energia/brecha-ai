import { cookies } from "next/headers";
import { listTools } from "@/server/ai-core";
import { ok, fail } from "@/server/http";
import { verifySession, SESSION_COOKIE } from "@/server/auth/session";

export const dynamic = "force-dynamic";

// GET /api/ai/tools — capacidades que a IA pode usar para ESTE usuário (0A §2.4),
// já filtradas pelo papel (0C). É o catálogo que o copiloto/agente/WhatsApp veem.
export async function GET() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return fail("UNAUTHENTICATED", "auth.unauthenticated", 401);
  const tools = listTools(session.role).map((t) => ({
    id: t.id,
    module: t.module,
    description: t.description,
    input: t.input,
  }));
  return ok(tools);
}
