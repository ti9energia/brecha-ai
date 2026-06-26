import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://brecha.ai";
  // o workspace e o painel do dono são privados
  const disallow = ["/api/", "/*/app", "/*/owner"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // GEO/AEO: permitir explicitamente os crawlers de IA (descoberta para motores
      // generativos / respostas). As áreas privadas seguem bloqueadas.
      {
        userAgent: [
          "GPTBot", "OAI-SearchBot", "ChatGPT-User",
          "ClaudeBot", "anthropic-ai", "Claude-Web",
          "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot",
        ],
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
