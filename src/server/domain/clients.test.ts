import { describe, it, expect } from "vitest";
import { listFirmClients, clientStructure, clientBrechas, firmPortfolio } from "./store";

// Escritório (perfil firm): o MESMO detector roda POR CLIENTE, cruzando o perfil de
// cada empresa da carteira com as normas. É a profundidade do perfil escritório.
describe("escritório — detecção de brechas por cliente", () => {
  it("deriva o ClientStructure de cada cliente da carteira", () => {
    const st = clientStructure("fc-5");
    expect(st).toBeTruthy();
    expect(st!.businessProfile).toMatch(/energia/i);
    expect(st!.regime).toBe("Lucro Real");
    expect(st!.annualRevenue).toBeGreaterThan(0);
  });

  it("acha brechas específicas de cada cliente pela descrição (clientes ≠ → brechas ≠)", () => {
    const solar = clientBrechas("fc-5"); // SolarOne — energia/autoprodução
    expect(solar.length).toBeGreaterThan(0);
    expect(solar.some((o) => o.sector === "energy")).toBe(true);

    const log = clientBrechas("fc-4"); // LogPlus — logística/passivo
    expect(log.some((o) => o.sector === "logistics")).toBe(true);

    // perfis diferentes → conjuntos de normas-gatilho diferentes
    expect(solar.map((o) => o.normId).sort()).not.toEqual(log.map((o) => o.normId).sort());
  });

  it("o portfólio agrega a contagem REAL de brechas dos clientes", () => {
    const p = firmPortfolio();
    const sum = listFirmClients().reduce((s, c) => s + clientBrechas(c.id).length, 0);
    expect(p.openBrechas).toBe(sum);
    expect(p.clients).toBe(listFirmClients().length);
  });

  it("cliente inexistente → estrutura null e zero brechas", () => {
    expect(clientStructure("nope")).toBeNull();
    expect(clientBrechas("nope")).toEqual([]);
  });
});
