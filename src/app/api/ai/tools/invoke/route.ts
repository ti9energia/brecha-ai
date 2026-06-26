import { cookies } from "next/headers";
import { invokeTool } from "@/server/ai-core";
import { orgEntitlements } from "@/server/domain/store";
import { ok, fail } from "@/server/http";
import { rateLimit } from "@/server/security/rateLimit";
import { verifySession, SESSION_COOKIE } from "@/server/auth/session";

// POST /api/ai/tools/invoke — execução governada de uma tool (0A §2.9). Checa
// sessão + RBAC da tool antes de rodar. Usado pelo AI Core/agente/WhatsApp.
export async function POST(req: Request) {
  const limited = rateLimit(req, "ai-tools", { max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return fail("UNAUTHENTICATED", "auth.unauthenticated", 401);

  let body: { tool?: unknown; input?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_BODY", "errors.invalid_body");
  }
  if (typeof body?.tool !== "string") return fail("INVALID_TOOL", "errors.invalid_body");
  const input = body.input && typeof body.input === "object" ? (body.input as Record<string, unknown>) : {};

  const result = invokeTool(body.tool, input, {
    role: session.role,
    userName: session.name,
    entitlements: orgEntitlements(session.orgId),
  });
  if (!result.ok) {
    return result.error === "NOT_FOUND"
      ? fail("TOOL_NOT_FOUND", "errors.not_found", 404)
      : fail("FORBIDDEN", "auth.forbidden", 403);
  }
  return ok(result.data, { tool: result.toolId });
}
