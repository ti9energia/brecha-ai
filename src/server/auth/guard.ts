// ─────────────────────────────────────────────────────────────────────────────
// Guardas de autorização para route handlers (runtime Node). Defesa-em-profundidade
// no servidor — o RBAC client-side (NavRail/CommandPalette/OwnerView) é só UX; a
// fonte da verdade é aqui. Padrão de uso:
//   const { session, error } = await requireRole("platform_owner");
//   if (error) return error;
// ─────────────────────────────────────────────────────────────────────────────
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE, type SessionUser } from "./session";
import { fail } from "@/server/http";

type Guard =
  | { session: SessionUser; error: null }
  | { session: null; error: NextResponse };

export async function requireSession(): Promise<Guard> {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return { session: null, error: fail("UNAUTHENTICATED", "auth.unauthenticated", 401) };
  return { session, error: null };
}

export async function requireRole(...roles: SessionUser["role"][]): Promise<Guard> {
  const res = await requireSession();
  if (res.error) return res;
  if (!roles.includes(res.session.role)) {
    return { session: null, error: fail("FORBIDDEN", "auth.forbidden", 403) };
  }
  return res;
}
