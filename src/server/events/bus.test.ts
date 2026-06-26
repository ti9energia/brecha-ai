import { describe, it, expect, vi } from "vitest";
import { on, emit } from "./bus";

describe("event bus (0D §5)", () => {
  it("entrega o evento a todos os inscritos e devolve a contagem", () => {
    const a = vi.fn();
    const b = vi.fn();
    on("plan.updated", a);
    on("plan.updated", b);
    const n = emit("plan.updated", { id: "plan-x" });
    expect(n).toBe(2);
    expect(a).toHaveBeenCalledWith({ id: "plan-x" });
    expect(b).toHaveBeenCalledWith({ id: "plan-x" });
  });

  it("on() devolve unsubscribe e isola falha de um subscriber", () => {
    const ok = vi.fn();
    const off = on("tenant.created", () => { throw new Error("boom"); });
    on("tenant.created", ok);
    expect(() => emit("tenant.created", { name: "X" })).not.toThrow();
    expect(ok).toHaveBeenCalled();
    off();
  });

  it("emitir evento sem inscritos é no-op (0)", () => {
    expect(emit("opportunity.simulated", {})).toBe(0);
  });
});
