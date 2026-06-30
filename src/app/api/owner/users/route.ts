import { listUsers, createUser } from "@/server/auth/users";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET /api/owner/users — lista global de usuários (0C §2.3). platform_owner/staff only;
// nunca expõe o hash de senha. Gated por requireRole — rateLimit no POST (escrita).
export async function GET() {
  const gate = await requireRole("platform_owner", "platform_staff");
  if (gate.error) return gate.error;
  return ok(listUsers());
}

// POST /api/owner/users — criar novo usuário (0C §2.3).
export async function POST(req: Request) {
  const limited = rateLimit(req, "owner-users-write", { max: 20, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const { email, name, role, orgId, accountType, password } = body;
  if (typeof email !== "string" || typeof name !== "string" || typeof role !== "string" || typeof orgId !== "string") {
    return fail("INVALID_INPUT", "errors.invalid_input", 400);
  }
  const created = await createUser({ email, name, role: role as Parameters<typeof createUser>[0]["role"], orgId, accountType: accountType as Parameters<typeof createUser>[0]["accountType"], password: typeof password === "string" ? password : undefined });
  if (!created) return fail("USER_EXISTS", "errors.conflict", 409);
  return ok(created, { created: true });
}
