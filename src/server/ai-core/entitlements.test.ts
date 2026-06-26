import { describe, it, expect } from "vitest";
import { orgEntitlements, isModuleEntitled } from "@/server/domain/store";
import { listTools, invokeTool, permissionMatrix, ROLES_ORDER } from "./tools";

// 0C §4.4 / 0D §3 — acesso = papel E plano.
const RADAR_PLAN = ["radar", "structure", "copilot", "whatsapp"]; // plan-radar (sem oportunidades/execução)

describe("entitlements (acesso = papel E plano)", () => {
  it("isModuleEntitled: módulos de plano respeitam o entitlements; governança/núcleo passam sempre", () => {
    expect(isModuleEntitled("radar", RADAR_PLAN)).toBe(true);
    expect(isModuleEntitled("opportunities", RADAR_PLAN)).toBe(false); // fora do plano
    expect(isModuleEntitled("execution", RADAR_PLAN)).toBe(false);
    expect(isModuleEntitled("settings", RADAR_PLAN)).toBe(true); // governança não depende de plano
    expect(isModuleEntitled("owner", RADAR_PLAN)).toBe(true);
  });

  it("orgEntitlements: Acme (org-acme) está num plano que libera execução", () => {
    const ent = orgEntitlements("org-acme");
    expect(ent).toContain("opportunities");
    expect(ent).toContain("execution");
  });

  it("listTools filtra por plano (e sem entitlements volta ao filtro só por papel)", () => {
    const ids = listTools("manager", RADAR_PLAN).map((t) => t.id);
    expect(ids).toContain("radar:read");
    expect(ids).not.toContain("opportunities:read");
    expect(listTools("manager").map((t) => t.id)).toContain("opportunities:read");
  });

  it("invokeTool nega tool de módulo fora do plano (FORBIDDEN) e libera a do plano", () => {
    const denied = invokeTool("opportunities:read", {}, { role: "manager", userName: "Ana", entitlements: RADAR_PLAN });
    expect(denied.ok).toBe(false);
    const allowed = invokeTool("radar:read", {}, { role: "manager", userName: "Ana", entitlements: RADAR_PLAN });
    expect(allowed.ok).toBe(true);
  });

  it("permissionMatrix (0C §2.10) reflete o RBAC das tools", () => {
    const m = permissionMatrix();
    expect(m.length).toBeGreaterThan(0);
    const exec = m.find((r) => r.id === "execution:start")!;
    expect(exec.roles.manager).toBe(true);
    expect(exec.roles.viewer).toBe(false);
    expect(m.find((r) => r.id === "opportunities:read")!.roles.viewer).toBe(true);
    expect(ROLES_ORDER).toContain("platform_owner");
  });
});
