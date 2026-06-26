import { describe, it, expect } from "vitest";
import { paginate } from "./http";
import { setIdempotent, getIdempotent } from "./security/idempotency";

describe("paginação por cursor (00-PADRÃO §4)", () => {
  const rows = Array.from({ length: 12 }, (_, i) => i);

  it("página + cursor de continuação até o fim", () => {
    const p1 = paginate(rows, null, 5);
    expect(p1.page).toEqual([0, 1, 2, 3, 4]);
    expect(p1.nextCursor).toBeTruthy();
    const p2 = paginate(rows, p1.nextCursor, 5);
    expect(p2.page).toEqual([5, 6, 7, 8, 9]);
    const p3 = paginate(rows, p2.nextCursor, 5);
    expect(p3.page).toEqual([10, 11]);
    expect(p3.nextCursor).toBeNull();
  });

  it("cursor inválido vira início; limite clampado", () => {
    expect(paginate(rows, "lixo", 5).page).toEqual([0, 1, 2, 3, 4]);
    expect(paginate(rows, null, 999).page.length).toBe(12);
  });
});

describe("Idempotency-Key (00-PADRÃO §4)", () => {
  it("guarda e devolve o mesmo resultado pela chave", () => {
    expect(getIdempotent("k-inexistente")).toBeNull();
    setIdempotent("k-1", { plan: "x" }, { approvedBy: "Ana" });
    const e = getIdempotent("k-1");
    expect(e?.data).toEqual({ plan: "x" });
    expect(e?.meta).toEqual({ approvedBy: "Ana" });
  });
});
