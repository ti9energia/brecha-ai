import { describe, it, expect, beforeEach, vi } from "vitest";
import { signSession, type SessionUser } from "@/server/auth/session";

// Conciliação é ação financeira (entra na base do success fee) → manager+. Mesmo mock
// de cookie do Next usado nos outros testes de RBAC de escrita.
const h = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (h.token ? { value: h.token } : undefined) }),
}));

import { POST as reconcile } from "./route";
import { getSavings } from "@/server/domain/store";

const base: Omit<SessionUser, "exp"> = {
  sub: "u-1", email: "a@acme.com.br", name: "Ana", role: "manager", orgId: "org-acme",
};

function postReq(body: unknown) {
  return new Request("http://localhost/api/savings/reconcile", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

beforeEach(() => { h.token = undefined; });

describe("POST /api/savings/reconcile — fecha o success fee (08 §7)", () => {
  it("401 sem sessão", async () => {
    expect((await reconcile(postReq({ id: "sav-5" }))).status).toBe(401);
  });

  it("403 para member (não pode conciliar)", async () => {
    h.token = await signSession({ ...base, role: "member" });
    expect((await reconcile(postReq({ id: "sav-5" }))).status).toBe(403);
  });

  it("200 manager: marca conciliado, soma à feeBase; segunda vez é 404 (idempotente)", async () => {
    h.token = await signSession(base);
    const before = getSavings();
    const rec = before.records.find((r) => r.id === "sav-5")!;
    expect(rec.reconciled).toBe(false); // fixture começa pendente
    const beforeBase = before.feeBase;

    const res = await reconcile(postReq({ id: "sav-5" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.feeBase).toBe(beforeBase + rec.realizedGain); // entrou na base
    expect(getSavings().records.find((r) => r.id === "sav-5")!.reconciled).toBe(true);

    // já conciliado → 404 (sem dupla contagem)
    expect((await reconcile(postReq({ id: "sav-5" }))).status).toBe(404);
  });

  it("404 para id inexistente", async () => {
    h.token = await signSession(base);
    expect((await reconcile(postReq({ id: "nao-existe" }))).status).toBe(404);
  });
});
