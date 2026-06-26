import { describe, it, expect } from "vitest";
import { relevanceFor, detectOpportunities, companySectors } from "./detector";
import { openDetectedOpportunities, listOpportunities } from "@/server/domain/store";
import type { ClientStructure, Norm } from "@/server/domain/types";

function structure(over: Partial<ClientStructure> = {}): ClientStructure {
  return {
    legalName: "Teste S.A.", taxId: "00.000.000/0001-00", regime: "Lucro Real",
    mainActivity: "Indústria metalúrgica", mainCnae: "24.21-1/00",
    businessProfile: "Indústria metalúrgica de aço com exportação.",
    activities: [{ code: "24.21-1/00", label: "Produção de aço" }],
    jurisdictions: ["SP"], headquarters: "São Paulo / SP",
    annualRevenue: 100_000_000, headcount: 500, entities: [],
    completeness: 0.8, lastReview: "2026-06-01", ...over,
  };
}

function norm(over: Partial<Norm> = {}): Norm {
  return {
    id: "n-test", level: "federal", jurisdiction: "Brasil",
    title: "Norma de teste", summary: "Resumo.", body: "Corpo.",
    source: { name: "DOU", ref: "Lei 0/2026", url: "https://x" },
    publishedAt: "2026-06-01", effectiveDate: "2026-07-01",
    relevance: 0, sector: "industry", tags: [], matched: false, ...over,
  };
}

describe("Detector de brechas (norma × empresa) — 08 §6/§12", () => {
  it("infere os setores da empresa a partir do texto livre + atividades", () => {
    const s = companySectors(structure({ businessProfile: "Transporte rodoviário de carga e usina solar." }));
    expect(s.has("logistics")).toBe(true);
    expect(s.has("energy")).toBe(true);
    expect(s.has("retail")).toBe(false);
  });

  it("relevância é maior para norma do setor do cliente do que para setor estranho", () => {
    const st = structure();
    const industry = relevanceFor(norm({ sector: "industry" }), st);
    const retail = relevanceFor(norm({ sector: "retail", jurisdiction: "Brasil" }), st);
    expect(industry.score).toBeGreaterThan(retail.score);
    expect(industry.reasons.length).toBeGreaterThan(0); // explica POR QUE casa
  });

  it("sintetiza a brecha com jogada + simulação + id determinístico", () => {
    const opps = detectOpportunities(structure(), [norm({ id: "n-credito", tags: ["crédito", "PIS/COFINS"], title: "Crédito de PIS/COFINS" })]);
    expect(opps).toHaveLength(1);
    const o = opps[0];
    expect(o.id).toBe("opp-auto-n-credito");
    expect(o.type).toBe("credit");
    expect(o.estimatedGain).toBeGreaterThan(0);
    expect(o.simulation.annualBurdenAfter).toBeLessThan(o.simulation.annualBurdenBefore);
    expect(o.recommendedMove.rationale.length).toBeGreaterThan(0);
  });

  it("pula normas que já têm oportunidade (skipNormIds) e as abaixo do limiar", () => {
    const norms = [
      norm({ id: "n-skip", sector: "industry" }),
      norm({ id: "n-irrelevant", sector: "health", jurisdiction: "Bahia", level: "state", tags: ["medicamento"] }),
    ];
    const opps = detectOpportunities(structure(), norms, { skipNormIds: new Set(["n-skip"]) });
    expect(opps.find((o) => o.normId === "n-skip")).toBeUndefined(); // já tem opp
    expect(opps.find((o) => o.normId === "n-irrelevant")).toBeUndefined(); // saúde/BA: irrelevante
  });

  it("A DESCRIÇÃO DA EMPRESA governa a detecção: a brecha de energia só abre se o perfil falar de energia", () => {
    const energyNorm = norm({
      id: "n-reidi", sector: "energy", tags: ["REIDI", "energia", "infraestrutura"],
      title: "Ampliação do REIDI para autoprodução de energia",
      summary: "Suspensão de PIS/COFINS para infraestrutura de energia renovável.",
    });
    const semEnergia = detectOpportunities(structure(), [energyNorm]);
    const comEnergia = detectOpportunities(
      structure({ businessProfile: "Indústria com projeto de autoprodução de energia (usina solar cativa)." }),
      [energyNorm],
    );
    expect(semEnergia).toHaveLength(0); // perfil não menciona energia → fica só no radar
    expect(comEnergia).toHaveLength(1); // perfil menciona energia → vira brecha
    expect(comEnergia[0].recommendedMove.rationale.join(" ")).toMatch(/Energia/i);
  });

  it("integração: o agente abre brechas para a Acme (logística/energia no perfil) e é idempotente", () => {
    const first = openDetectedOpportunities();
    expect(first.length).toBeGreaterThanOrEqual(1);
    expect(first.every((o) => o.id.startsWith("opp-auto-"))).toBe(true);

    const autoBefore = listOpportunities({ status: "all" }).filter((o) => o.id.startsWith("opp-auto-")).length;
    openDetectedOpportunities(); // segundo run não duplica
    const autoAfter = listOpportunities({ status: "all" }).filter((o) => o.id.startsWith("opp-auto-")).length;
    expect(autoAfter).toBe(autoBefore);
  });
});

describe("Detector — escopo monitorado (Configurações) e robustez", () => {
  it("setor fora do escopo monitorado não é avaliado, mesmo sendo relevante", () => {
    const energyNorm = norm({ id: "n-e", sector: "energy", tags: ["energia", "REIDI"], title: "Incentivo de energia" });
    const st = structure({ businessProfile: "Indústria com autoprodução de energia solar." });
    expect(detectOpportunities(st, [energyNorm])).toHaveLength(1); // sem filtro → acha
    expect(detectOpportunities(st, [energyNorm], { monitoredSectors: ["industry"] })).toHaveLength(0); // energy desligado
    expect(detectOpportunities(st, [energyNorm], { monitoredSectors: ["industry", "energy"] })).toHaveLength(1); // ligou energy
  });

  it("norma estadual fora das UFs vigiadas é barrada pelo gate; federal sempre passa", () => {
    const stateNorm = norm({
      id: "n-rj", level: "state", jurisdiction: "Rio de Janeiro", sector: "industry",
      title: "Crédito de ICMS para a indústria metalúrgica", tags: ["ICMS", "metalúrgica"],
    });
    const st = structure({ jurisdictions: ["RJ"] }); // grupo atua no RJ → relevante por jurisdição
    expect(detectOpportunities(st, [stateNorm])).toHaveLength(1); // sem gate de UF, é relevante
    expect(detectOpportunities(st, [stateNorm], { monitoredJurisdictions: ["SP"] })).toHaveLength(0); // RJ não vigiada
    const fed = norm({ id: "n-fed", level: "federal", jurisdiction: "Brasil", sector: "industry", tags: ["crédito"] });
    expect(detectOpportunities(st, [fed], { monitoredJurisdictions: ["SP"] })).toHaveLength(1); // federal passa
  });

  it("perfil livre vazio: ainda detecta pelo setor derivado das atividades", () => {
    const st = structure({ businessProfile: "", activities: [{ code: "24", label: "Indústria metalúrgica de aço" }] });
    expect(detectOpportunities(st, [norm({ id: "n-i", sector: "industry", tags: ["crédito"] })])).toHaveLength(1);
  });

  it("invariantes da brecha: janela válida, confiança = relevância, ganho escala com faturamento", () => {
    const small = structure({ annualRevenue: 10_000_000 });
    const big = structure({ annualRevenue: 1_000_000_000 });
    const n = norm({ id: "n-x", sector: "industry", tags: ["incentivo", "SUDENE"] });
    const [os] = detectOpportunities(small, [n]);
    const [ob] = detectOpportunities(big, [n]);
    expect(new Date(os.windowEnd).getTime()).toBeGreaterThan(new Date(os.windowStart).getTime());
    expect(os.confidence).toBe(relevanceFor(n, small).score);
    expect(ob.estimatedGain).toBeGreaterThan(os.estimatedGain);
    expect(os.simulation.annualGain).toBe(os.estimatedGain);
  });
});
