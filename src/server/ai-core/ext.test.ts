import { describe, it, expect } from "vitest";
import { inMemoryKnowledge } from "./knowledge";
import { listConnectors, getConnector } from "./connectors";
import { trainingSnapshot } from "./training";

describe("AI Core — knowledge (RAG) / connectors / training", () => {
  it("knowledge recupera chunks relevantes, ordenados por score", async () => {
    const r = await inMemoryKnowledge.retrieve("ICMS subvenção crédito", "org-acme", 3);
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].score).toBeGreaterThan(0);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
  });

  it("knowledge retorna vazio para consulta sem termos úteis", async () => {
    expect(await inMemoryKnowledge.retrieve("a o e", "org-acme")).toEqual([]);
  });

  it("connectors lista o connector de demonstração e resolve por id", async () => {
    expect(listConnectors().length).toBeGreaterThan(0);
    const c = getConnector("gazette-br");
    expect(c?.status()).toBe("connected");
    const sync = await c!.sync("org-acme");
    expect(sync).toHaveProperty("ingested");
  });

  it("trainingSnapshot reflete o feedback capturado (0..1)", () => {
    const s = trainingSnapshot();
    expect(s.total).toBeGreaterThanOrEqual(0);
    expect(s.approvalRate).toBeGreaterThanOrEqual(0);
    expect(s.approvalRate).toBeLessThanOrEqual(1);
  });
});
