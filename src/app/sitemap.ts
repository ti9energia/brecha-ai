import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://brecha.ai";
  const now = new Date();
  const languages = Object.fromEntries(locales.map((l) => [l, `${base}/${l}`]));

  const entries: MetadataRoute.Sitemap = [];
  for (const l of locales) {
    entries.push({
      url: `${base}/${l}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: l === "pt-BR" ? 1 : 0.8,
      alternates: { languages },
    });
    entries.push({
      url: `${base}/${l}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }
  return entries;
}
