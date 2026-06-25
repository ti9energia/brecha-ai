import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale, isLocale } from "./i18n/config";
import { verifySession, SESSION_COOKIE } from "./server/auth/session";

const PUBLIC_FILE = /\.(.*)$/;
const PROTECTED_PAGES = ["app"]; // /owner é um módulo dentro de /app (RBAC client-side por papel)

function detectLocale(req: NextRequest): string {
  const cookie = req.cookies.get("NEXT_LOCALE")?.value;
  if (isLocale(cookie)) return cookie;
  const accept = req.headers.get("accept-language");
  if (accept) {
    const wanted = accept.split(",").map((p) => p.split(";")[0].trim());
    for (const w of wanted) {
      if (isLocale(w)) return w;
      const base = w.split("-")[0].toLowerCase();
      const hit = locales.find((l) => l.split("-")[0].toLowerCase() === base);
      if (hit) return hit;
    }
  }
  return defaultLocale;
}

function unauthorized() {
  return NextResponse.json(
    { data: null, meta: null, error: { code: "UNAUTHENTICATED", messageKey: "auth.unauthenticated" } },
    { status: 401 },
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Guarda defensiva contra paths protocol-relative/backslash (open-redirect).
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("\\")) {
    return NextResponse.next();
  }

  // ── API: auth + health públicos; o resto exige sessão ──
  if (pathname.startsWith("/api")) {
    if (pathname.startsWith("/api/auth") || pathname === "/api/health") {
      return NextResponse.next();
    }
    const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return unauthorized();
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next") || pathname.startsWith("/assets") || PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  // ── Páginas: garante prefixo de locale ──
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (!hasLocale) {
    const locale = detectLocale(req);
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    const res = NextResponse.redirect(url);
    res.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // ── Proteção de páginas privadas (/app, /owner) ──
  const segments = pathname.split("/").filter(Boolean); // [locale, seg, ...]
  const locale = segments[0];
  const seg = segments[1];
  if (seg && PROTECTED_PAGES.includes(seg)) {
    const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // inclui /api (sem ponto) e páginas; exclui _next e arquivos com extensão.
  matcher: ["/((?!_next|.*\\..*).*)"],
};
