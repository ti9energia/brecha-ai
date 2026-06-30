import { describe, it, expect } from "vitest";
import { ingestDocument, inMemoryKnowledge, ingestedCount } from "./knowledge";
import { remember, recall, memorySize } from "./memory";
import { getConnector } from "./connectors";

describe("AI Core completo — RAG por tenant, memória, connector sync (0A)", () => {
  it("ingestDocument isola por tenant: só o tenant que ingeriu recupera", async () => {
    ingestDocument("org-x", {
      title: "Crédito de PIS sobre energia",
      text: "novo entendimento permite crédito de PIS/COFINS sobre energia elétrica industrial",
      ref: "Solução de Consulta 99",
    });
    const hitX = await inMemoryKnowledge.retrieve("crédito de PIS energia", "org-x", 5);
    expect(hitX.some((c) => c.ref === "Solução de Consulta 99")).toBe(true);
    // outro tenant NÃO recupera o que foi ingerido para org-x (isolamento)
    const hitY = await inMemoryKnowledge.retrieve("crédito de PIS energia", "org-y", 5);
    expect(hitY.some((c) => c.ref === "Solução de Consulta 99")).toBe(false);
    expect(ingestedCount("org-x")).toBeGreaterThan(0);
  });

  it("memória por usuário lembra e recupera os últimos turnos (KVStore async, Onda 3)", async () => {
    await remember("u-x", { role: "user", content: "quais janelas abrem?" });
    await remember("u-x", { role: "assistant", content: "você tem 6 janelas abertas" });
    const turns = await recall("u-x");
    expect(turns.length).toBe(2);
    expect(turns[0].role).toBe("user");
    expect(await memorySize("u-x")).toBe(2);
    expect((await recall("u-inexistente")).length).toBe(0);
  });

  it("connector sync ingere normas no RAG do tenant (efeito real)", async () => {
    const c = getConnector("gazette-br")!;
    const before = ingestedCount("org-sync");
    const res = await c.sync("org-sync");
    expect(res.ingested).toBeGreaterThan(0);
    expect(ingestedCount("org-sync")).toBe(before + res.ingested);
  });
});
