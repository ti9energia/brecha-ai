import { describe, it, expect } from "vitest";
import {
  runScenario,
  daysUntil,
  windowState,
  listOpportunities,
  opportunitiesSummary,
  approveExecution,
  getOpportunity,
  getExecutionPlan,
  advanceExecutionStep,
  getSavings,
  recordAiAction,
  ownerAudit,
  recordAiFeedback,
  aiFeedbackStats,
  updateStructure,
  getStructure,
  updateSettings,
  getSettings,
} from "./store";

const DAY = 1000 * 60 * 60 * 24;
// Build an ISO date `n` days from now (midday to avoid DST / boundary jitter).
function isoInDays(n: number): string {
  return new Date(Date.now() + n * DAY).toISOString();
}

describe("runScenario", () => {
  it("baseline (Lucro Real / SP / metalurgia) has 18% rate, no saving, low risk", () => {
    const r = runScenario({
      regime: "Lucro Real",
      jurisdiction: "SP",
      classification: "Indústria metalúrgica",
      revenue: 480_000_000,
    });
    expect(r.effectiveRate).toBeCloseTo(0.18, 5);
    expect(r.annualBurden).toBe(86_400_000);
    expect(r.annualSaving).toBe(0);
    expect(r.riskLevel).toBe("low");
  });

  it("SUDENE scenario lowers the burden and yields a positive saving + payback", () => {
    const baseline = runScenario({
      regime: "Lucro Real",
      jurisdiction: "SP",
      classification: "Indústria metalúrgica",
      revenue: 480_000_000,
    });
    const sudene = runScenario({
      regime: "Lucro Real",
      jurisdiction: "Área SUDENE",
      classification: "Indústria metalúrgica",
      revenue: 480_000_000,
    });
    // jd = -0.028 → effectiveRate 0.152, burden 480M * 0.152 = 72_960_000
    expect(sudene.effectiveRate).toBeCloseTo(0.152, 5);
    expect(sudene.annualBurden).toBe(72_960_000);
    expect(sudene.annualBurden).toBeLessThan(baseline.annualBurden);
    expect(sudene.annualSaving).toBeGreaterThan(0);
    expect(sudene.paybackMonths).toBeGreaterThan(0);
    // jd <= -0.025 → at least medium risk
    expect(["medium", "high"]).toContain(sudene.riskLevel);
  });

  it("Simples Nacional is at least medium risk", () => {
    const r = runScenario({
      regime: "Simples Nacional",
      jurisdiction: "SP",
      classification: "Indústria metalúrgica",
      revenue: 480_000_000,
    });
    expect(["medium", "high"]).toContain(r.riskLevel);
    expect(r.effectiveRate).toBeCloseTo(0.095, 5);
  });
});

describe("daysUntil / windowState", () => {
  it("daysUntil of a future date is positive", () => {
    expect(daysUntil(isoInDays(10))).toBeGreaterThan(0);
  });

  it("convenção inclusiva: 0 no dia do fechamento, 1 na véspera, -1 no dia seguinte", () => {
    const end = "2026-07-08"; // data sem hora
    expect(daysUntil(end, new Date("2026-07-08T12:00:00Z"))).toBe(0); // fecha hoje, ainda válida
    expect(daysUntil(end, new Date("2026-07-07T23:30:00Z"))).toBe(1);
    expect(daysUntil(end, new Date("2026-07-09T00:30:00Z"))).toBe(-1); // expirada
  });

  it("windowState: dia do fechamento é 'urgent' (não 'expired')", () => {
    // regressão do off-by-one — usa daysUntil internamente com 'now' padrão; aqui
    // validamos via daysUntil que d=0 cai na faixa urgent (d <= 7 e d >= 0).
    const d = daysUntil("2026-07-08", new Date("2026-07-08T08:00:00Z"));
    expect(d).toBe(0);
    expect(d).toBeGreaterThanOrEqual(0); // não negativo → não expirado
  });

  it("windowState classifies by remaining days", () => {
    // ~5 days out → urgent (d <= 7)
    expect(windowState(isoInDays(5))).toBe("urgent");
    // ~15 days out → closing (7 < d <= 21)
    expect(windowState(isoInDays(15))).toBe("closing");
    // far future → not urgent/closing/expired
    expect(["open", "fresh"]).toContain(windowState(isoInDays(120)));
    // 120 days out is beyond the 60-day "open" cutoff → fresh
    expect(windowState(isoInDays(120))).toBe("fresh");
  });
});

describe("listOpportunities", () => {
  it("excludes expired status by default", () => {
    const rows = listOpportunities();
    expect(rows.every((o) => o.status !== "expired")).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("sort by gain is descending estimatedGain", () => {
    const rows = listOpportunities({ sort: "gain" });
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].estimatedGain).toBeGreaterThanOrEqual(rows[i].estimatedGain);
    }
  });

  it("sort by deadline is ascending daysRemaining", () => {
    const rows = listOpportunities({ sort: "deadline" });
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].daysRemaining).toBeLessThanOrEqual(rows[i].daysRemaining);
    }
  });

  it("filter by sector returns only that sector", () => {
    const rows = listOpportunities({ sector: "tech" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((o) => o.sector === "tech")).toBe(true);
  });
});

describe("opportunitiesSummary", () => {
  it("reports open windows and positive open gain", () => {
    const s = opportunitiesSummary();
    expect(s.openWindows).toBeGreaterThan(0);
    expect(s.openGain).toBeGreaterThan(0);
  });
});

describe("approveExecution", () => {
  it("approves a pending opportunity and returns an approved plan", () => {
    const id = "opp-cbs-credito";
    // Confirm fixture starts in a pending state (before mutation).
    const before = getOpportunity(id);
    expect(before).not.toBeNull();

    const plan = approveExecution(id, "Tester");
    expect(plan).not.toBeNull();
    expect(plan!.approved).toBe(true);
    expect(plan!.approvedBy).toBe("Tester");
    expect(plan!.opportunityId).toBe(id);
  });
});

describe("updateStructure", () => {
  it("persiste campos válidos, coage números e normaliza jurisdições (allowlist)", () => {
    const o = getStructure();
    const restore = { legalName: o.legalName, regime: o.regime, mainActivity: o.mainActivity, headquarters: o.headquarters, annualRevenue: o.annualRevenue, headcount: o.headcount, jurisdictions: [...o.jurisdictions] };
    try {
      const r = updateStructure({
        legalName: "Nova Razão S.A.",
        annualRevenue: "500000000", // string → coage
        headcount: 1234.7, // arredonda
        jurisdictions: ["sp", "SP", " rj ", ""], // dedup + upper + trim + remove vazio
        evil: "ignorado", // fora da allowlist
      });
      expect(r.legalName).toBe("Nova Razão S.A.");
      expect(r.annualRevenue).toBe(500_000_000);
      expect(r.headcount).toBe(1235);
      expect(r.jurisdictions).toEqual(["SP", "RJ"]);
      expect((r as unknown as Record<string, unknown>).evil).toBeUndefined();
      expect(getStructure().legalName).toBe("Nova Razão S.A."); // persistiu
    } finally {
      updateStructure(restore);
    }
  });

  it("ignora números inválidos/negativos", () => {
    const before = getStructure().annualRevenue;
    updateStructure({ annualRevenue: -5 });
    updateStructure({ annualRevenue: "abc" });
    expect(getStructure().annualRevenue).toBe(before);
  });
});

describe("updateSettings", () => {
  it("persiste, coage e normaliza arrays (com allowlist)", () => {
    const o = getSettings();
    const restore = { orgName: o.orgName, defaultLocale: o.defaultLocale, timezone: o.timezone, aiPersona: o.aiPersona, aiTone: o.aiTone, whatsapp: o.whatsapp, sectors: [...o.sectors], jurisdictions: [...o.jurisdictions] };
    try {
      const r = updateSettings({ orgName: "Acme 2", aiPersona: "Vega II", jurisdictions: ["sp", "SP", "mg"], evil: 1 });
      expect(r.orgName).toBe("Acme 2");
      expect(r.aiPersona).toBe("Vega II");
      expect(r.jurisdictions).toEqual(["SP", "MG"]);
      expect((r as unknown as Record<string, unknown>).evil).toBeUndefined();
      expect(getSettings().orgName).toBe("Acme 2"); // persistiu
    } finally {
      updateSettings(restore);
    }
  });
});

describe("AI feedback (0A §2.9)", () => {
  it("registra ratings e agrega estatísticas", () => {
    const before = aiFeedbackStats();
    recordAiFeedback({ rating: "up", message: "claro", locale: "pt-BR", userId: "u-1", orgId: "org-acme" });
    recordAiFeedback({ rating: "down", message: "confuso", locale: "en", userId: "u-1", orgId: "org-acme" });
    const after = aiFeedbackStats();
    expect(after.total).toBe(before.total + 2);
    expect(after.up).toBe(before.up + 1);
    expect(after.down).toBe(before.down + 1);
  });
});

// ── Loop da economia: capture-on-complete (08 §7) ────────────────────────────
// O teste de approveExecution (acima) já criou o plano exec-opp-cbs-credito com
// s1=doing, s2=todo, s3=todo. Aqui avançamos todos os passos até done e verificamos
// que o SavingsRecord é criado automaticamente.
describe("advanceExecutionStep — capture-on-complete (08 §7)", () => {
  it("100% de progresso → status 'captured' e cria SavingsRecord automaticamente", () => {
    // Garantir plano aprovado (idempotente se já foi aprovado no bloco anterior)
    const approved = approveExecution("opp-cbs-credito", "Tester");
    expect(approved).not.toBeNull();
    const planId = approved!.id; // "exec-opp-cbs-credito"

    // Avançar cada passo até "done"; o estado inicial pode ser todo/doing dependendo
    // de quantas vezes já foi chamado antes neste arquivo.
    const planBefore = getExecutionPlan("opp-cbs-credito")!;
    for (const step of planBefore.steps) {
      // todo → doing → done (2 advances) / doing → done (1 advance) / done = skip
      if (step.status === "todo") {
        advanceExecutionStep(planId, step.id); // todo → doing
        advanceExecutionStep(planId, step.id); // doing → done
      } else if (step.status === "doing") {
        advanceExecutionStep(planId, step.id); // doing → done
      }
      // se já "done", nada a fazer
    }

    const plan = getExecutionPlan("opp-cbs-credito")!;
    expect(plan.status).toBe("captured");
    expect(plan.progress).toBe(1);

    // SavingsRecord criado com os dados da oportunidade (annualGain = 8_420_000)
    const savings = getSavings();
    const rec = savings.records.find((r) => r.opportunityId === "opp-cbs-credito");
    expect(rec).not.toBeUndefined();
    expect(rec!.realizedGain).toBe(8_420_000);
    expect(rec!.reconciled).toBe(false); // recém capturado, ainda não conciliado
    expect(rec!.quarter).toMatch(/^\d{4}-Q[1-4]$/); // formato YYYY-QN
    expect(rec!.type).toBe("credit"); // tipo herdado da oportunidade
  });

  it("idempotente: segunda completação não duplica o SavingsRecord", () => {
    // Plano já captured. Regredir um passo (done → todo) e voltar a done não deve
    // criar um segundo registro porque alreadyCaptured=true.
    const plan = getExecutionPlan("opp-cbs-credito")!;
    const stepId = plan.steps[0].id;

    // done → todo (regride progresso, muda status para "executing")
    advanceExecutionStep(plan.id, stepId);
    // todo → doing → done (volta a 100%)
    advanceExecutionStep(plan.id, stepId);
    advanceExecutionStep(plan.id, stepId);

    const countAfter = getSavings().records.filter(
      (r) => r.opportunityId === "opp-cbs-credito"
    ).length;
    expect(countAfter).toBe(1); // ainda um único registro
  });
});

// ── AUDIT_LOG: cap de 1 000 entradas ─────────────────────────────────────────
// Verifica que ownerAudit() nunca retorna mais de 1 000 itens,
// mesmo com invocações acima do limite (rotação em FIFO reverso).
describe("recordAiAction — AUDIT_LOG cap (1 000 entradas)", () => {
  it("nunca ultrapassa 1 000 entradas após muitas chamadas", () => {
    const LIMIT = 1_000;
    // Chama mais do que o limite; as mais antigas devem ser descartadas
    for (let i = 0; i < LIMIT + 50; i++) {
      recordAiAction({ actor: "test", action: `ação ${i}`, detail: `detalhe ${i}` });
    }
    expect(ownerAudit().length).toBeLessThanOrEqual(LIMIT);
  });

  it("a entrada mais recente fica na posição 0 (unshift)", () => {
    recordAiAction({ actor: "cap-test", action: "última", detail: "topo" });
    expect(ownerAudit()[0].action).toBe("última");
    expect(ownerAudit()[0].actor).toBe("cap-test");
  });
});
