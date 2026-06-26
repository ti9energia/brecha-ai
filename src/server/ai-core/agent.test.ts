import { describe, it, expect } from "vitest";
import { agentRun } from "./agent";
import { ownerAudit } from "@/server/domain/store";

describe("Agente Autônomo (0A §4)", () => {
  it("computa recomendações válidas dos dados ao vivo e audita o run", () => {
    const before = ownerAudit().length;
    const recs = agentRun(new Date("2026-06-25T12:00:00Z"));
    expect(Array.isArray(recs)).toBe(true);
    for (const r of recs) {
      expect(r.id).toBeTruthy();
      expect(["window_closing", "structure_gap", "new_opportunity", "reconcile"]).toContain(r.kind);
      expect(typeof r.confidence).toBe("number");
      if (r.kind === "window_closing") expect(r.opportunityId).toBeTruthy();
    }
    expect(ownerAudit().length).toBe(before + 1); // run auditado (0A §2.8)
  });

  it("emite a recomendação de conciliação quando há economia não conciliada (08 §7)", () => {
    const recs = agentRun(new Date("2026-06-25T12:00:00Z"));
    const rec = recs.find((r) => r.kind === "reconcile");
    expect(rec).toBeTruthy();
    expect(rec!.impact).toBeGreaterThan(0);
    expect(rec!.opportunityId).toBeTruthy();
  });

  it("recomendações saem no idioma do usuário (i18n — 00-PADRÃO §6)", () => {
    const pt = agentRun(new Date("2026-06-25T12:00:00Z"), "pt-BR");
    const en = agentRun(new Date("2026-06-25T12:00:00Z"), "en");
    const gapPt = pt.find((r) => r.kind === "structure_gap");
    const gapEn = en.find((r) => r.kind === "structure_gap");
    expect(gapPt).toBeTruthy();
    expect(gapEn).toBeTruthy();
    expect(gapEn!.title).toBe("Incomplete profile lowers accuracy"); // traduzido
    expect(gapPt!.title).not.toBe(gapEn!.title); // muda por locale
  });
});
