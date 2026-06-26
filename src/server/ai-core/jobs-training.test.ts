import { describe, it, expect } from "vitest";
import { trainingPipeline } from "./training";
import { runScheduledJobs } from "./jobs";
import { listConnectors } from "./connectors";

describe("jobs agendados + pipeline de treino (0A §2.7/§4, 08 §6)", () => {
  it("trainingPipeline deriva curated/eval/version/status do feedback", () => {
    const p = trainingPipeline();
    expect(p.version).toMatch(/^brecha-fiscal@v\d+$/);
    expect(p.evalScore).toBeGreaterThanOrEqual(0);
    expect(p.evalScore).toBeLessThanOrEqual(0.99);
    expect(["collecting", "ready_to_train", "evaluated"]).toContain(p.status);
    expect(p.curated).toBeLessThanOrEqual(p.snapshot.total);
  });

  it("connectors: diários + ERP + assinatura disponíveis", () => {
    const ids = listConnectors().map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(["gazette-br", "erp", "esign"]));
  });

  it("runScheduledJobs roda os connectors de leitura + o agente", async () => {
    const r = await runScheduledJobs("org-jobs");
    expect(r.synced).toBeGreaterThanOrEqual(1); // o connector de diários é read
    expect(r.ingested).toBeGreaterThan(0); // e ingere no RAG do tenant
    expect(r.recommendations).toBeGreaterThanOrEqual(0);
  });
});
