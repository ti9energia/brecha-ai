// JSON-LD (schema.org) para AEO/GEO — ajuda motores de busca e de IA a ENTENDER e
// RESPONDER sobre o produto: Organization + SoftwareApplication + FAQPage. Server
// component; renderiza um <script type="application/ld+json"> no idioma da página.
import { localeMeta, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";

export function StructuredData({ locale, faq }: { locale: Locale; faq: { q: string; a: string }[] }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://brecha.ai";
  const desc = getT(locale, "meta")("description");
  const tagline = getT(locale, "brand")("tagline");
  const validFaq = faq.filter((f) => f.q && !f.q.startsWith("faq.") && f.a && !f.a.startsWith("faq."));

  const graph: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#org`,
        name: "Brecha.ai",
        url: base,
        description: desc,
        slogan: tagline,
      },
      {
        "@type": "SoftwareApplication",
        name: "Brecha.ai",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, PWA (iOS/Android)",
        url: `${base}/${locale}`,
        inLanguage: localeMeta[locale].intl,
        description: desc,
        publisher: { "@id": `${base}/#org` },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "BRL",
          lowPrice: "9900",
          highPrice: "39900",
          offerCount: 3,
        },
      },
      validFaq.length
        ? {
            "@type": "FAQPage",
            mainEntity: validFaq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }
        : null,
    ].filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      // dados próprios, JSON-encoded; escapa "<" para evitar quebrar o </script>
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }}
    />
  );
}
