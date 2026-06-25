import { NextResponse } from "next/server";
import { SESSION_COOKIE, cookieOptions } from "@/server/auth/session";

// POST /api/auth/logout — limpa o cookie de sessão.
export async function POST() {
  const res = NextResponse.json({ data: { ok: true }, meta: null, error: null });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
