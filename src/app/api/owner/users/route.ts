import { listUsers } from "@/server/auth/users";
import { ok } from "@/server/http";
import { requireRole } from "@/server/auth/guard";

// GET /api/owner/users — lista global de usuários (0C §2.3). platform_owner only;
// nunca expõe o hash de senha.
export async function GET() {
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;
  return ok(listUsers());
}
