import { describe, it, expect } from "vitest";
import { makeFormatter } from "./format";

describe("makeFormatter (pt-BR)", () => {
  const f = makeFormatter("pt-BR");

  it("money renders the amount and the BRL currency marker", () => {
    const s = f.money(1000, "BRL");
    expect(typeof s).toBe("string");
    expect(s).toContain("1");
    // BRL in a pt-BR locale renders the "R$" marker.
    expect(s).toContain("R$");
  });

  it("percent renders the scaled value", () => {
    const s = f.percent(0.18);
    expect(s).toContain("18");
    expect(s).toContain("%");
  });

  it("moneyCompact is shorter than the full money string", () => {
    const full = f.money(2_400_000, "BRL");
    const compact = f.moneyCompact(2_400_000);
    expect(typeof compact).toBe("string");
    expect(compact.length).toBeLessThan(full.length);
  });
});
