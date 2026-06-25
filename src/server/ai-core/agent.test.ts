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
});
