import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale, isLocale } from "./i18n/config";

const PUBLIC_FILE = /\.(.*)$/;

function detectLocale(req: NextRequest): string {
  const cookie = req.cookies.get("NEXT_LOCALE")?.value;
  if (isLocale(cookie)) return cookie;

  const accept = req.headers.get("accept-language");
  if (accept) {
    const wanted = accept.split(",").map((p) => p.split(";")[0].trim());
    for (const w of wanted) {
      if (isLocale(w)) return w;
      // match by base language (pt → pt-BR, zh → zh-CN, fr → fr-FR)
      const base = w.split("-")[0].toLowerCase();
      const hit = locales.find((l) => l.split("-")[0].toLowerCase() === base);
      if (hit) return hit;
    }
  }
  return defaultLocale;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip internals, API and static assets.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasLocale) return NextResponse.next();

  const locale = detectLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  const res = NextResponse.redirect(url);
  res.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}

export const config = {
  matcher: ["/((?!_next|api|assets|.*\\..*).*)"],
};
