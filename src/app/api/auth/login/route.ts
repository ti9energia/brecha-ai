import { NextResponse } from "next/server";
import { authenticate } from "@/server/auth/users";
import { signSession, SESSION_COOKIE, cookieOptions } from "@/server/auth/session";
import { fail } from "@/server/http";
import { rateLimit, rateLimitBy } from "@/server/security/rateLimit";

// POST /api/auth/login — valida credenciais, assina a sessão e seta o cookie.
export async function POST(req: Request) {
  // Dois limites: por IP (coarse) e por e-mail alvo (resiste à rotação de IP num
  // ataque de brute-force/credential-stuffing contra uma conta específica).
  const limited = rateLimit(req, "login", { max: 10, windowMs: 60_000 });
  if (limited) return limited;

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_BODY", "errors.invalid_body");
  }
  const email = String(body?.email ?? "").slice(0, 160);
  const password = String(body?.password ?? "").slice(0, 200);
  if (!email || !password) return fail("MISSING_CREDENTIALS", "errors.missing_credentials");

  const limitedByEmail = rateLimitBy(email.trim().toLowerCase(), "login-email", { max: 5, windowMs: 60_000 });
  if (limitedByEmail) return limitedByEmail;

  const user = await authenticate(email, password);
  if (!user) return fail("INVALID_CREDENTIALS", "auth.invalidCreds", 401);

  const token = await signSession(user);
  const res = NextResponse.json({
    data: { user: { name: user.name, email: user.email, role: user.role } },
    meta: null,
    error: null,
  });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions);
  return res;
}
