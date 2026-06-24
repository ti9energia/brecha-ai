import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://brecha.ai";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // o workspace e o painel do dono são privados
      disallow: ["/api/", "/*/app", "/*/owner"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
