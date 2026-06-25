import { describe, it, expect } from "vitest";
import { getDictionary } from "./dictionary";
import { getPath } from "./translate";
import ptBR from "./messages/pt-BR";
import en from "./messages/en";
import zhCN from "./messages/zh-CN";
import frFR from "./messages/fr-FR";

// Achata um catálogo aninhado em caminhos-folha ("a.b.c"). Usado para garantir
// que cada idioma define NATIVAMENTE toda chave do pt-BR (a fonte da verdade) —
// o merge de fallback esconderia chaves faltantes, então testamos os catálogos crus.
function leafKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...leafKeys(v as Record<string, unknown>, path));
    } else {
      out.push(path);
    }
  }
  return out;
}

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

describe("locale parity (raw catalogs)", () => {
  const source = new Set(leafKeys(ptBR as Record<string, unknown>));
  const others = { en, "fr-FR": frFR, "zh-CN": zhCN } as const;

  for (const [name, cat] of Object.entries(others)) {
    const keys = new Set(leafKeys(cat as Record<string, unknown>));
    it(`${name} defines every pt-BR key natively (no fallback gaps)`, () => {
      expect([...source].filter((k) => !keys.has(k))).toEqual([]);
    });
    it(`${name} has no orphan keys absent from pt-BR`, () => {
      expect([...keys].filter((k) => !source.has(k))).toEqual([]);
    });
  }
});
