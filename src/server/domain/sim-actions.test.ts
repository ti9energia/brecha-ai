import { describe, it, expect } from "vitest";
import { saveScenario, listScenarios, createOpportunityFromScenario, getOpportunity } from "./store";

// Botões do simulador que viraram REAIS (antes só toast).
describe("ações do simulador", () => {
  it("saveScenario persiste e aparece em listScenarios", () => {
    const before = listScenarios().length;
    const scn = saveScenario(
      "Teste",
      { regime: "Lucro Real", jurisdiction: "SP", classification: "Indústria metalúrgica", revenue: 1000 },
      { annualBurden: 100, annualSaving: 50, effectiveRate: 0.1, riskLevel: "low", paybackMonths: 6 },
    );
    expect(scn.id).toContain("scn-user");
    expect(listScenarios().length).toBe(before + 1);
    expect(listScenarios().some((s) => s.id === scn.id)).toBe(true);
  });

  it("createOpportunityFromScenario cria uma oportunidade aberta e recuperável (com join da norma)", () => {
    const opp = createOpportunityFromScenario(
      { regime: "Lucro Real", jurisdiction: "Área SUDENE", classification: "Indústria metalúrgica", revenue: 480_000_000 },
      { annualBurden: 74_000_000, annualSaving: 12_000_000, effectiveRate: 0.15, riskLevel: "medium", paybackMonths: 14 },
    );
    expect(opp.status).toBe("open");
    expect(opp.type).toBe("jurisdiction");
    expect(opp.estimatedGain).toBe(12_000_000);
    const fetched = getOpportunity(opp.id);
    expect(fetched?.title).toBe(opp.title);
    expect(fetched?.norm).toBeTruthy();
  });
});
