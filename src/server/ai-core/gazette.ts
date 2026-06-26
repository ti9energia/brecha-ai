// ─────────────────────────────────────────────────────────────────────────────
// Normalização de feed de diário oficial (DOU/CONFAZ/SEFAZ/DOM) → Norm[]. É o que o
// gazetteConnector (0A §2.5) usa para transformar a fonte externa REAL no contrato de
// domínio, alimentando o radar e o detector de brechas. Puro e tolerante: aceita array
// direto ou { items: [...] }, ignora itens sem título e aplica defaults seguros.
// ─────────────────────────────────────────────────────────────────────────────
import type { Norm, NormLevel, SectorId } from "@/server/domain/types";

const LEVELS = new Set<NormLevel>(["federal", "state", "municipal"]);
const SECTORS = new Set<SectorId>([
  "industry", "agribusiness", "tech", "retail", "logistics", "energy", "health", "finance", "construction",
]);
const DEFAULT_DATE = "2026-01-01"; // determinístico (sem Date.now) p/ itens sem data

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function slug(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}
function isoDate(v: unknown, fallback: string): string {
  const s = str(v);
  if (!s) return fallback;
  return Number.isNaN(new Date(s).getTime()) ? fallback : s;
}
function levelOf(v: unknown): NormLevel {
  const s = str(v).toLowerCase() as NormLevel;
  return LEVELS.has(s) ? s : "federal";
}
function sectorOf(v: unknown): SectorId {
  const s = str(v).toLowerCase() as SectorId;
  return SECTORS.has(s) ? s : "industry";
}
function tagsOf(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 40)).slice(0, 12);
}

export function parseGazetteFeed(payload: unknown): Norm[] {
  const items = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown }).items)
      ? (payload as { items: unknown[] }).items
      : [];

  const out: Norm[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const title = str(o.title);
    if (!title) continue; // item sem título não é norma utilizável

    const summary = str(o.summary) || title;
    const published = isoDate(o.publishedAt, DEFAULT_DATE);
    const ref = str(o.ref) || title.slice(0, 80);
    out.push({
      id: str(o.id) || `norm-feed-${slug(ref || title)}`,
      level: levelOf(o.level),
      jurisdiction: str(o.jurisdiction) || "Brasil",
      title,
      summary,
      body: str(o.body) || summary,
      source: { name: str(o.sourceName) || "Diário Oficial", ref, url: str(o.url) },
      publishedAt: published,
      effectiveDate: isoDate(o.effectiveDate, published),
      relevance: 0, // o detector calcula a relevância cruzando com a estrutura
      sector: sectorOf(o.sector),
      tags: tagsOf(o.tags),
      matched: false,
    });
  }
  return out;
}
