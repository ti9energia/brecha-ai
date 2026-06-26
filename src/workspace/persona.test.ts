import { describe, it, expect } from "vitest";
import { modulesForPersona, defaultModuleFor, allowedModuleIds } from "./registry";

// Navegação por perfil: cada perfil vê as ABAS CORRETAS e parte do módulo certo.
describe("navegação por perfil (abas corretas)", () => {
  it("escritório vê Clientes + produto; autônomo NÃO vê Clientes nem owner", () => {
    const firm = modulesForPersona("firm").map((m) => m.id);
    expect(firm).toContain("clients");
    expect(firm).toContain("opportunities");
    expect(firm).not.toContain("owner");

    const company = modulesForPersona("company").map((m) => m.id);
    expect(company).toContain("opportunities");
    expect(company).not.toContain("clients");
    expect(company).not.toContain("owner");
  });

  it("dono vê governança, não as abas de produto", () => {
    const owner = modulesForPersona("owner").map((m) => m.id);
    expect(owner).toContain("owner");
    expect(owner).toContain("settings");
    expect(owner).not.toContain("opportunities");
    expect(owner).not.toContain("clients");
  });

  it("módulo de partida por perfil", () => {
    expect(defaultModuleFor("firm")).toBe("clients");
    expect(defaultModuleFor("owner")).toBe("owner");
    expect(defaultModuleFor("company")).toBe("opportunities");
  });

  it("allowedModuleIds bate com modulesForPersona", () => {
    const allowed = allowedModuleIds("firm");
    expect(allowed.has("clients")).toBe(true);
    expect(allowed.has("owner")).toBe(false);
  });
});
