import { permissionMatrix, ROLES_ORDER } from "@/server/ai-core/tools";
import { ok } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET /api/owner/permissions — matriz de permissões do RBAC (0C §2.10).
// Onda 6: expõe permissionMatrix + ROLES_ORDER via HTTP para que OwnerView
// não precise importar @/server/ai-core/tools (módulo server-only).
export async function GET(req: Request) {
  const limited = await rateLimit(req, "owner-permissions", { max: 60, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("platform_owner", "platform_staff");
  if (gate.error) return gate.error;
  return ok({ matrix: permissionMatrix(), roles: ROLES_ORDER });
}
