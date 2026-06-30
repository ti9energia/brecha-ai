// Testa os subscribers do event bus (0D §5): verifica que os 6 eventos
// são recebidos e não lançam exceção, e que os 3 "eventos antes mortos"
// (savings.reconciled, opportunity.simulated, plan.updated) agora têm
// ao menos um handler registrado.
import { describe, it, expect, vi, beforeAll } from "vitest";
import { emit, on } from "./bus";
import { registerSubscribers } from "./subscribers";

// Registra os subscribers uma única vez antes dos testes.
// Cada describe neste arquivo roda no mesmo worker → o bus é compartilhado,
// mas a lógica de idempotência (flag `registered`) já protege contra duplo-registro.
beforeAll(() => {
  registerSubscribers();
});

describe("subscribers — eventos antes mortos agora têm handler (Onda 1)", () => {
  it("savings.reconciled: emit retorna ≥ 1 (ao menos 1 subscriber)", () => {
    // Qualquer handler registrado por registerSubscribers() conta.
    const count = emit("savings.reconciled", { id: "sav-test", gain: 1000 });
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("opportunity.simulated: emit retorna ≥ 1", () => {
    const count = emit("opportunity.simulated", { id: "opp-test", gain: 5000 });
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("plan.updated: emit retorna ≥ 1", () => {
    const count = emit("plan.updated", { id: "plan-test", opportunityId: "opp-test", status: "executing" });
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("plan.updated com status 'captured': emit retorna ≥ 1 e não lança exceção", () => {
    expect(() =>
      emit("plan.updated", { id: "plan-cap", opportunityId: "opp-cbs-credito", status: "captured" })
    ).not.toThrow();
    const count = emit("plan.updated", { id: "plan-cap", opportunityId: "opp-cbs-credito", status: "captured" });
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

describe("subscribers — eventos originais continuam funcionando", () => {
  it("execution.approved: emit retorna ≥ 1", () => {
    const count = emit("execution.approved", { opportunityId: "opp-x", title: "Teste" });
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("tenant.created: emit retorna ≥ 1", () => {
    const count = emit("tenant.created", { name: "Tenant Teste" });
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("tenant.status_changed: emit retorna ≥ 1", () => {
    const count = emit("tenant.status_changed", { id: "t-x", status: "suspended" });
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

describe("subscribers — registerSubscribers é idempotente", () => {
  it("chamar duas vezes não duplica handlers", () => {
    // Conta handlers antes da segunda chamada (spy no retorno do emit)
    const before = emit("tenant.created", { name: "Antes" });
    registerSubscribers(); // segunda chamada — deve ser no-op pelo flag `registered`
    const after = emit("tenant.created", { name: "Depois" });
    // Contagem deve ser a mesma (nenhum handler novo foi registrado)
    expect(after).toBe(before);
  });
});
