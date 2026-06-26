import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/server/auth/session";
import { ok, fail } from "@/server/http";

export const dynamic = "force-dynamic";

// GET /api/auth/me — usuário da sessão atual (ou 401).
export async function GET() {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return fail("UNAUTHENTICATED", "auth.unauthenticated", 401);
  return ok({ name: session.name, email: session.email, role: session.role, orgId: session.orgId, accountType: session.accountType ?? "company" });
}
