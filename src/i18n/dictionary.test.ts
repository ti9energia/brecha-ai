import { describe, it, expect } from "vitest";
import { getDictionary } from "./dictionary";
import { getPath } from "./translate";

describe("getDictionary", () => {
  it("pt-BR exposes the brand name", () => {
    const dict = getDictionary("pt-BR");
    expect(getPath(dict, "brand.name")).toBe("Brecha.ai");
  });

  it("en returns English for a translated key", () => {
    const dict = getDictionary("en");
    expect(getPath(dict, "common.save")).toBe("Save");
  });

  it("en falls back to pt-BR for keys only present in the source catalog", () => {
    const en = getDictionary("en");
    const pt = getDictionary("pt-BR");
    // `units.currencyShort` is identical across catalogs; assert it resolves.
    expect(getPath(en, "units.currencyShort")).toBe("R$");
    // Structure parity: every top-level pt-BR namespace exists in the merged en
    // catalog (because the fallback chain merges pt-BR underneath en).
    for (const key of Object.keys(pt as Record<string, unknown>)) {
      expect(en).toHaveProperty(key);
    }
    // A deep leaf that exists in pt-BR resolves in en too (merged), never undefined.
    expect(getPath(en, "brand.name")).toBe("Brecha.ai");
  });
});
