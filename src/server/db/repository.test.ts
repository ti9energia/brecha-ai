import { describe, it, expect, beforeEach } from "vitest";
import { getRepository, __setRepository } from "./repository";
import { InMemoryRepository } from "./inMemoryRepository";

describe("repository seam (persistência trocável)", () => {
  beforeEach(() => {
    __setRepository(null);
    delete process.env.DATABASE_URL;
  });

  it("getRepository() usa o InMemory sem DATABASE_URL (default zero-config)", () => {
    expect(getRepository()).toBeInstanceOf(InMemoryRepository);
  });

  it("InMemory: listOpportunities devolve rows com a norma e os campos derivados, ordenados por ganho", async () => {
    const repo = new InMemoryRepository();
    const rows = await repo.listOpportunities({ sort: "gain" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].norm).toBeTruthy();
    expect(typeof rows[0].daysRemaining).toBe("number");
    expect(rows[0].estimatedGain).toBeGreaterThanOrEqual(rows[rows.length - 1].estimatedGain);
  });

  it("InMemory: getOpportunity retorna null para id inexistente", async () => {
    expect(await new InMemoryRepository().getOpportunity("nao-existe")).toBeNull();
  });

  it("InMemory: listRadar inclui opportunityId (join norma→oportunidade) e daysSince", async () => {
    const radar = await new InMemoryRepository().listRadar();
    expect(radar.length).toBeGreaterThan(0);
    expect(radar[0]).toHaveProperty("opportunityId");
    expect(radar[0]).toHaveProperty("daysSince");
  });

  it("InMemory: opportunitiesSummary e getStructure respondem o contrato", async () => {
    const repo = new InMemoryRepository();
    const sum = await repo.opportunitiesSummary();
    expect(sum.openWindows).toBeGreaterThan(0);
    expect(sum.capturedYtd).toBeGreaterThanOrEqual(0);
    expect((await repo.getStructure()).legalName).toBeTruthy();
  });

  it("write-side: updateStructure persiste e approveExecution devolve o plano", async () => {
    const repo = new InMemoryRepository();
    const st = await repo.updateStructure({ regime: "Lucro Presumido" });
    expect(st.regime).toBe("Lucro Presumido");
    const pending = (await repo.listOpportunities({ status: "all" })).find((o) => o.status === "pending_approval");
    if (pending) {
      const plan = await repo.approveExecution(pending.id, "Tester");
      expect(plan).toBeTruthy();
    }
  });

  it("multi-tenant: getStructure/updateStructure isolam por orgId", async () => {
    const repo = new InMemoryRepository();
    const acmeName = (await repo.getStructure("org-acme")).legalName;
    const otherId = "tenant-mt-x";
    expect((await repo.getStructure(otherId)).legalName).not.toBe(acmeName);
    await repo.updateStructure({ regime: "Simples Nacional" }, otherId);
    expect((await repo.getStructure(otherId)).regime).toBe("Simples Nacional");
    // o tenant default (acme) permanece intacto — isolamento por orgId
    expect((await repo.getStructure("org-acme")).regime).not.toBe("Simples Nacional");
  });
});
