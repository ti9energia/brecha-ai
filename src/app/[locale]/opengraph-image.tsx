import { ImageResponse } from "next/og";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";

// OG image dinâmica por locale (SEO/social/AEO). Next detecta este arquivo e injeta
// og:image + twitter:image automaticamente. Satori (inline styles, sem className).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Brecha.ai — GPS de oportunidade regulatória";

export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : defaultLocale) as Locale;
  const title = getT(locale, "meta")("title").replace("Brecha.ai — ", "");
  const tagline = getT(locale, "brand")("tagline");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", background: "#0d0f16", color: "#edeef3", padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 999, border: "7px solid #ca8a04" }} />
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Brecha.ai</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.08, maxWidth: 1000 }}>{title}</div>
          <div style={{ fontSize: 30, color: "#ca8a04" }}>{tagline}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
