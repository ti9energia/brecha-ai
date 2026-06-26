import { describe, it, expect } from "vitest";
import { parseGazetteFeed } from "./gazette";
import { addRadarNorm, getNorm, getStructure } from "@/server/domain/store";
import { detectOpportunities } from "@/server/ai/detector";

describe("gazette — parser de feed de diário oficial (DOU/CONFAZ/SEFAZ)", () => {
  it("normaliza itens (array) em Norm[] e ignora os sem título", () => {
    const norms = parseGazetteFeed([
      { id: "norm-x", title: "Crédito novo", summary: "resumo", level: "federal", sector: "industry", tags: ["crédito"], ref: "Lei 9/2026", url: "http://x", publishedAt: "2026-06-01" },
      { summary: "sem título" }, // ignorado
      "lixo", // ignorado
    ]);
    expect(norms).toHaveLength(1);
    expect(norms[0].id).toBe("norm-x");
    expect(norms[0].relevance).toBe(0); // calculada depois pelo detector
    expect(norms[0].matched).toBe(false);
    expect(norms[0].sector).toBe("industry");
    expect(norms[0].tags).toEqual(["crédito"]);
  });

  it("aceita { items: [...] } e aplica defaults seguros (nível/setor/data inválidos)", () => {
    const norms = parseGazetteFeed({ items: [{ title: "Sem campos", level: "xxx", sector: "zzz", publishedAt: "data-ruim" }] });
    expect(norms).toHaveLength(1);
    expect(norms[0].level).toBe("federal"); // default
    expect(norms[0].sector).toBe("industry"); // default
    expect(norms[0].jurisdiction).toBe("Brasil"); // default
    expect(Number.isNaN(new Date(norms[0].publishedAt).getTime())).toBe(false); // data válida (default)
    expect(norms[0].id).toMatch(/^norm-feed-/); // id derivado do título/ref
  });

  it("payload inesperado → lista vazia (resiliente)", () => {
    expect(parseGazetteFeed(null)).toEqual([]);
    expect(parseGazetteFeed("oops")).toEqual([]);
    expect(parseGazetteFeed({ nope: 1 })).toEqual([]);
  });

  it("integração: norma do feed entra no radar (dedupe) e o detector a considera", () => {
    const [n] = parseGazetteFeed([{
      id: "norm-feed-test-1", title: "Crédito presumido para a indústria metalúrgica",
      summary: "Crédito de PIS/COFINS sobre insumos", level: "federal", sector: "industry",
      tags: ["crédito", "PIS/COFINS"], ref: "IN RFB 99/2026",
    }]);
    expect(addRadarNorm(n)).not.toBeNull(); // adicionada ao radar
    expect(addRadarNorm(n)).toBeNull(); // segunda vez: dedupe por id
    expect(getNorm("norm-feed-test-1")).toBeTruthy();

    // o detector enxerga a norma NOVA e abre brecha (Acme é indústria / Lucro Real)
    const opps = detectOpportunities(getStructure(), [n]);
    expect(opps).toHaveLength(1);
    expect(opps[0].normId).toBe("norm-feed-test-1");
    expect(opps[0].estimatedGain).toBeGreaterThan(0);
  });
});
