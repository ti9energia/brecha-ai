import { describe, it, expect, beforeEach, vi } from "vitest";
import { signSession, type SessionUser } from "@/server/auth/session";

// CRUD do Painel do Dono (0C §2.2/§2.3/§2.4/§8) — platform_owner only.
const h = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (_n: string) => (h.token ? { value: h.token } : undefined) }),
}));

import { GET as getUsers } from "./users/route";
import { POST as createTenant } from "./tenants/route";
import { PATCH as patchTenant } from "./tenants/[id]/route";
import { PUT as putPlan } from "./plans/[id]/route";

const owner: Omit<SessionUser, "exp"> = {
  sub: "u-owner", email: "owner@brecha.ai", name: "Dono", role: "platform_owner", orgId: "org-acme",
};

function req(path: string, method: string, body?: unknown) {
  return new Request(`http://localhost/api/owner/${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => { h.token = undefined; });

describe("/api/owner/* — admin CRUD", () => {
  it("403 para não-owner (member) e 401 sem sessão", async () => {
    expect((await getUsers()).status).toBe(401);
    h.token = await signSession({ ...owner, role: "member" });
    expect((await getUsers()).status).toBe(403);
  });

  it("owner lista usuários (sem expor hash de senha)", async () => {
    h.token = await signSession(owner);
    const res = await getUsers();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0].passwordHash).toBeUndefined();
  });

  it("owner cria tenant (trial) e depois suspende", async () => {
    h.token = await signSession(owner);
    const created = await createTenant(req("tenants", "POST", { name: "Nova Holding", plan: "plan-radar" }));
    expect(created.status).toBe(200);
    const cj = await created.json();
    expect(cj.data.status).toBe("trial");
    const id = cj.data.id as string;

    const patched = await patchTenant(req(`tenants/${id}`, "PATCH", { status: "suspended" }), { params: Promise.resolve({ id }) });
    expect(patched.status).toBe(200);
    expect((await patched.json()).data.status).toBe("suspended");
  });

  it("403 para member tentando criar tenant", async () => {
    h.token = await signSession({ ...owner, role: "member" });
    expect((await createTenant(req("tenants", "POST", { name: "X" }))).status).toBe(403);
  });

  it("owner edita os entitlements de um plano (0C §2.4 → casa com a aplicação em runtime)", async () => {
    h.token = await signSession(owner);
    const res = await putPlan(req("plans/plan-radar", "PUT", { entitlements: ["radar", "savings"] }), { params: Promise.resolve({ id: "plan-radar" }) });
    expect(res.status).toBe(200);
    expect((await res.json()).data.entitlements).toContain("savings");
  });

  it("404 ao editar plano inexistente", async () => {
    h.token = await signSession(owner);
    const res = await putPlan(req("plans/nope", "PUT", { price: 1 }), { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
