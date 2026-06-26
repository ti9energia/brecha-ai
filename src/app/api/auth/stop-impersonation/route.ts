import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, signSession, SESSION_COOKIE, cookieOptions } from "@/server/auth/session";
import { userById } from "@/server/auth/users";
import { fail } from "@/server/http";

// POST /api/auth/stop-impersonation — encerra a impersonação e volta a ser o dono.
// Fica em /api/auth (público no middleware) porque a sessão impersonada tem papel
// `manager`, que não passaria pelo gate de /api/owner. O handler valida `imp`.
export async function POST() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session || !session.imp) return fail("NOT_IMPERSONATING", "auth.forbidden", 403);

  const owner = userById(session.imp);
  if (!owner) return fail("OWNER_NOT_FOUND", "errors.not_found", 404);

  const token = await signSession(owner); // re-assina como o dono original
  const res = NextResponse.json({ data: { restored: true }, meta: null, error: null });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions);
  return res;
}
