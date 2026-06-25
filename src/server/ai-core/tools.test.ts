import { describe, it, expect } from "vitest";
import { listTools, invokeTool } from "./tools";
import { ownerAudit } from "@/server/domain/store";

describe("AI Core — tools registry (0A §2.4 / RBAC 0C)", () => {
  it("lista tools por papel: viewer não vê writers; manager vê", () => {
    const viewer = listTools("viewer").map((t) => t.id);
    expect(viewer).toContain("opportunities:read");
    expect(viewer).not.toContain("structure:update");
    expect(viewer).not.toContain("execution:start");

    const manager = listTools("manager").map((t) => t.id);
    expect(manager).toContain("structure:update");
    expect(manager).toContain("execution:start");
  });

  it("invoca tool de leitura permitida", () => {
    const r = invokeTool("opportunities:read", {}, { role: "viewer", userName: "V" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Array.isArray(r.data)).toBe(true);
  });

  it("nega invocação fora da alçada (viewer → execution:start)", () => {
    const r = invokeTool("execution:start", { opportunityId: "opp-cbs-credito" }, { role: "viewer", userName: "V" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
  });

  it("tool inexistente → NOT_FOUND", () => {
    const r = invokeTool("nao:existe", {}, { role: "platform_owner", userName: "O" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("NOT_FOUND");
  });

  it("audita toda invocação — concedida e negada (0A §2.8)", () => {
    const before = ownerAudit().length;
    invokeTool("opportunities:read", {}, { role: "manager", userName: "Marina" });
    invokeTool("execution:start", {}, { role: "viewer", userName: "Vitor" }); // negada
    const log = ownerAudit();
    expect(log.length).toBe(before + 2);
    expect(log[0].actor).toBe("Vitor"); // mais recente no topo
    expect(log[0].action).toContain("tool:");
  });
});
