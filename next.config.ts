import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Saída autocontida para imagens Docker enxutas (Fly.io/Render/AWS).
  // Ignorado na Vercel (que usa o próprio runtime).
  output: "standalone",
  // Locale routing é manual via `app/[locale]` + middleware (App Router).
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async rewrites() {
    // API versionada (00-PADRÃO §4 / 0D §4): /api/v1/* é o caminho canônico de
    // versão; reescreve para os handlers em /api/*. O middleware normaliza o
    // prefixo /v1 nas checagens de auth.
    return [{ source: "/api/v1/:path*", destination: "/api/:path*" }];
  },
  async headers() {
    // CSP sem nonce (mantém render estático/CDN). React escapa toda saída e não
    // há sink de HTML cru; 'unsafe-inline' cobre o ThemeScript + scripts do Next.
    const dev = process.env.NODE_ENV !== "production";
    const csp = [
      "default-src 'self'",
      // dev precisa de 'unsafe-eval' (React Refresh); produção fica estrita.
      `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    const securityHeaders = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    return [
      { source: "/:path*", headers: securityHeaders },
      // o service worker precisa de escopo na raiz
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
};

export default nextConfig;
