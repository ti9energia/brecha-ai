import { describe, it, expect } from "vitest";
import { parseBrechaDraft, applyBrechaDraft, enrichBrecha, type AskFn } from "./detector-llm";
import type { Opportunity, Norm, ClientStructure } from "@/server/domain/types";

function opp(over: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "opp-auto-n1", normId: "n1", type: "credit", title: "Brecha X", summary: "…", sector: "industry",
    estimatedGain: 1_000_000, windowStart: "2026-07-01", windowEnd: "2026-09-29", effort: "medium",
    confidence: 0.6, status: "open", correlatedNorms: 1,
    recommendedMove: {
      headline: "Determinístico", fromState: "antes", toState: "depois",
      rationale: ["motivo determinístico"], requirements: ["req determinístico"],
    },
    simulation: {
      effectiveRateBefore: 0.18, effectiveRateAfter: 0.17, annualBurdenBefore: 100, annualBurdenAfter: 90,
      riskBefore: 25, riskAfter: 22, annualGain: 1_000_000, assumptions: ["a"],
    },
    createdAt: "2026-07-01", ...over,
  };
}
const N: Norm = {
  id: "n1", level: "federal", jurisdiction: "Brasil", title: "Norma", summary: "resumo", body: "corpo",
  source: { name: "DOU", ref: "Lei 1/2026", url: "" }, publishedAt: "2026-07-01", effectiveDate: "2026-07-01",
  relevance: 0, sector: "industry", tags: [], matched: false,
};
const ST = { legalName: "Acme", businessProfile: "Indústria", regime: "Lucro Real", jurisdictions: ["SP"], headquarters: "SP" } as unknown as ClientStructure;

describe("detector-llm — parse do JSON estruturado", () => {
  it("aceita JSON completo e válido", () => {
    const d = parseBrechaDraft('{"headline":"H","rationale":["r1","r2"],"requirements":["q"],"confidence":0.8,"type":"incentive"}');
    expect(d).toEqual({ headline: "H", rationale: ["r1", "r2"], requirements: ["q"], confidence: 0.8, type: "incentive" });
  });
  it("tolera prosa em volta do JSON", () => {
    const d = parseBrechaDraft('Claro! Aqui está:\n{"headline":"H"}\nEspero ter ajudado.');
    expect(d?.headline).toBe("H");
  });
  it("retorna null para texto sem JSON ou JSON inválido", () => {
    expect(parseBrechaDraft("sem json aqui")).toBeNull();
    expect(parseBrechaDraft("{quebrado")).toBeNull();
    expect(parseBrechaDraft("")).toBeNull();
  });
  it("descarta campos inválidos (tipo desconhecido, confiança fora de 0..1) e objeto vazio", () => {
    const d = parseBrechaDraft('{"type":"xpto","confidence":5,"headline":"ok"}');
    expect(d).toEqual({ headline: "ok" }); // type/confidence inválidos caíram
    expect(parseBrechaDraft("{}")).toBeNull(); // nada útil → null
  });
});

describe("detector-llm — aplicação preserva os números determinísticos", () => {
  it("sobrepõe linguagem/tipo/confiança mas mantém simulação, ganho, id e norma-gatilho", () => {
    const base = opp();
    const out = applyBrechaDraft(base, { headline: "Nova jogada", rationale: ["pq casa"], type: "incentive", confidence: 0.9 });
    expect(out.recommendedMove.headline).toBe("Nova jogada");
    expect(out.recommendedMove.rationale).toEqual(["pq casa"]);
    expect(out.type).toBe("incentive");
    expect(out.confidence).toBe(0.9);
    // intactos:
    expect(out.estimatedGain).toBe(base.estimatedGain);
    expect(out.simulation).toEqual(base.simulation);
    expect(out.normId).toBe("n1");
    expect(out.recommendedMove.requirements).toEqual(base.recommendedMove.requirements); // draft não trouxe → mantém
  });
});

describe("detector-llm — enriquecimento com fallback (ask injetável)", () => {
  const askJson: AskFn = async () => '{"headline":"Refinada pelo modelo","rationale":["motivo do modelo"]}';
  const askNull: AskFn = async () => null; // sem chave / erro
  const askGarbage: AskFn = async () => "desculpe, não consegui"; // sem JSON

  it("aplica o refino quando o modelo devolve JSON válido", async () => {
    const out = await enrichBrecha(opp(), N, ST, "pt-BR", askJson);
    expect(out.recommendedMove.headline).toBe("Refinada pelo modelo");
    expect(out.recommendedMove.rationale).toEqual(["motivo do modelo"]);
  });
  it("cai na versão determinística quando não há resposta do modelo", async () => {
    const out = await enrichBrecha(opp(), N, ST, "pt-BR", askNull);
    expect(out.recommendedMove.headline).toBe("Determinístico");
  });
  it("cai na versão determinística quando o modelo não devolve JSON", async () => {
    const out = await enrichBrecha(opp(), N, ST, "pt-BR", askGarbage);
    expect(out.recommendedMove.headline).toBe("Determinístico");
  });
});
