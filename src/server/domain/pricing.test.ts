import { describe, it, expect } from "vitest";
import { getPlans, orgEntitlements } from "./store";

// Preços por PERFIL: autônomo (empresa) e escritório (carteira). O dono do SaaS não paga.
describe("preços por perfil", () => {
  it("há planos para os dois perfis pagantes, com um 'popular' cada", () => {
    const plans = getPlans();
    const autonomo = plans.filter((p) => p.planType === "autonomo");
    const escritorio = plans.filter((p) => p.planType === "escritorio");
    expect(autonomo.length).toBeGreaterThanOrEqual(3);
    expect(escritorio.length).toBeGreaterThanOrEqual(3);
    expect(autonomo.filter((p) => p.popular).length).toBe(1);
    expect(escritorio.filter((p) => p.popular).length).toBe(1);
    // Enterprise do escritório é "sob consulta" (price 0).
    expect(escritorio.some((p) => p.price === 0)).toBe(true);
  });

  it("o escritório (org-silva-adv) é habilitado para as abas de produto", () => {
    const ents = orgEntitlements("org-silva-adv");
    expect(ents).toContain("opportunities");
    expect(ents).toContain("execution");
    expect(ents).toContain("savings");
  });
});
