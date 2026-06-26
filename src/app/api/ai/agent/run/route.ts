import { cookies } from "next/headers";
import { agentRun } from "@/server/ai-core/agent";
import { ok, fail } from "@/server/http";
import { rateLimit } from "@/server/security/rateLimit";
import { verifySession, SESSION_COOKIE } from "@/server/auth/session";

// POST /api/ai/agent/run — dispara o Agente Autônomo sobre os dados ao vivo
// (0A §2.9) e devolve a fila de recomendações. Cada run é auditado.
export async function POST(req: Request) {
  const limited = rateLimit(req, "agent-run", { max: 30, windowMs: 60_000 });
  if (limited) return limited;
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return fail("UNAUTHENTICATED", "auth.unauthenticated", 401);
  return ok(agentRun());
}
