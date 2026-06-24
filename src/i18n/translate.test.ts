import { describe, it, expect } from "vitest";
import { interpolate, getPath, deepMerge, createTranslator } from "./translate";

describe("interpolate", () => {
  it("replaces known variables", () => {
    expect(interpolate("Olá {name}", { name: "Ana" })).toBe("Olá Ana");
  });

  it("keeps the placeholder for missing variables", () => {
    expect(interpolate("Olá {name}", { other: "x" })).toBe("Olá {name}");
  });

  it("returns the template unchanged when no vars are given", () => {
    expect(interpolate("Olá {name}")).toBe("Olá {name}");
  });
});

describe("getPath", () => {
  it("resolves a nested path", () => {
    expect(getPath({ a: { b: "x" } }, "a.b")).toBe("x");
  });

  it("returns undefined for an unknown path", () => {
    expect(getPath({ a: { b: "x" } }, "a.c")).toBeUndefined();
    expect(getPath({ a: { b: "x" } }, "z.y.w")).toBeUndefined();
  });
});

describe("deepMerge", () => {
  it("deep-merges nested objects with later sources winning", () => {
    const merged = deepMerge<{ a: { x: number; y: number } }>(
      { a: { x: 1, y: 2 } },
      { a: { y: 9 } },
    );
    expect(merged).toEqual({ a: { x: 1, y: 9 } });
  });
});

describe("createTranslator", () => {
  it("translates a known key within a namespace", () => {
    const t = createTranslator({ nav: { home: "Início" } }, "nav");
    expect(t("home")).toBe("Início");
  });

  it("falls back to the leaf token (not the dotted path) for unknown keys", () => {
    const t = createTranslator({ nav: { home: "Início" } }, "nav");
    const result = t("missingKey");
    expect(result).toBe("missingKey");
    expect(result).not.toContain(".");
  });
});
