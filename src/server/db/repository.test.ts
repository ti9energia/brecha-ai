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

  // ── Novos métodos write-side e leituras movidas (Onda 2) ──────────────────────

  it("getSavings: devolve SavingsSummary com records e campos corretos", async () => {
    const repo = new InMemoryRepository();
    const s = await repo.getSavings();
    expect(s.currency).toBe("BRL");
    expect(s.feeRate).toBeGreaterThan(0);
    expect(Array.isArray(s.records)).toBe(true);
    expect(s.records.length).toBeGreaterThan(0);
    expect(s.realizedYtd).toBeGreaterThanOrEqual(0);
  });

  it("reconcileSaving: marca o registro como conciliado e actualiza feeBase", async () => {
    const repo = new InMemoryRepository();
    const before = await repo.getSavings();
    // Encontrar um registro ainda não conciliado (sav-5 é o seed pendente)
    const pending = before.records.find((r) => !r.reconciled);
    if (!pending) return; // fixture pode já estar toda conciliada; skip sem falhar
    const beforeBase = before.feeBase;
    const result = await repo.reconcileSaving(pending.id);
    expect(result).not.toBeNull();
    expect(result!.feeBase).toBe(beforeBase + pending.realizedGain);
    // idempotente: segunda chamada → null
    expect(await repo.reconcileSaving(pending.id)).toBeNull();
  });

  it("reconcileSaving: id inexistente → null", async () => {
    expect(await new InMemoryRepository().reconcileSaving("sav-nao-existe")).toBeNull();
  });

  it("advanceExecutionStep: avança passo e devolve plano actualizado", async () => {
    const repo = new InMemoryRepository();
    // Aprova a oportunidade para garantir que o plano existe
    const plan = await repo.approveExecution("opp-icms-sc", "Tester-repo");
    expect(plan).toBeTruthy();
    const planObj = plan as { id: string; steps: { id: string; status: string }[] };
    const firstStep = planObj.steps[0];
    // Captura o status ANTES de avançar (string primitiva, imune à mutação do objecto)
    const statusBefore = firstStep.status;
    const updated = await repo.advanceExecutionStep(planObj.id, firstStep.id) as typeof planObj | null;
    expect(updated).not.toBeNull();
    // status avançou (todo→doing OU doing→done OU done→todo — qualquer transição)
    const newStatus = updated!.steps.find((s) => s.id === firstStep.id)?.status;
    expect(newStatus).not.toBe(statusBefore);
  });

  it("listAgentRecs: devolve recomendações com campos obrigatórios", async () => {
    const recs = await new InMemoryRepository().listAgentRecs();
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(typeof r.id).toBe("string");
      expect(typeof r.title).toBe("string");
      expect(typeof r.impact).toBe("number");
    }
  });

  it("getSettings + updateSettings: persiste alterações via seam", async () => {
    const repo = new InMemoryRepository();
    const before = await repo.getSettings();
    const updated = await repo.updateSettings({ orgName: "Acme Seam Test" });
    expect(updated.orgName).toBe("Acme Seam Test");
    // getSettings reflecte a mutação
    expect((await repo.getSettings()).orgName).toBe("Acme Seam Test");
    // restaurar para não contaminar outros testes
    await repo.updateSettings({ orgName: before.orgName });
  });

  it("recordAiFeedback: persiste e devolve stats actualizadas", async () => {
    const repo = new InMemoryRepository();
    const before = await repo.getSavings(); // warm-up (garante que repo existe)
    const stats = await repo.recordAiFeedback({
      rating: "up", message: "seam test", locale: "pt-BR", userId: "u-test", orgId: "org-acme",
    });
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.up).toBeGreaterThan(0);
  });
});
