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
