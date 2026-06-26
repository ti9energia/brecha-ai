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
import { POST as impersonate } from "./tenants/[id]/impersonate/route";
import { PUT as putLanding } from "./landing/route";
import { GET as getBilling } from "./billing/route";
import { POST as payInvoice } from "./billing/[id]/pay/route";
import { PUT as putConfig } from "./tenants/[id]/config/route";
import { listTenants, getLandingContent, listInvoices, getTenantConfig } from "@/server/domain/store";

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

  it("impersonate (0C §2.2): 403 para member; owner re-emite a sessão do tenant", async () => {
    const id = listTenants()[0].id;
    h.token = await signSession({ ...owner, role: "member" });
    expect((await impersonate(req(`tenants/${id}/impersonate`, "POST"), { params: Promise.resolve({ id }) })).status).toBe(403);
    h.token = await signSession(owner);
    const res = await impersonate(req(`tenants/${id}/impersonate`, "POST"), { params: Promise.resolve({ id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).meta.impersonating).toBe(true);
  });

  it("CMS da landing (0C §2.5): 403 para member; owner edita o herói por locale", async () => {
    h.token = await signSession({ ...owner, role: "member" });
    expect((await putLanding(req("landing", "PUT", { locale: "pt-BR", heroTitleA: "X" }))).status).toBe(403);
    h.token = await signSession(owner);
    const res = await putLanding(req("landing", "PUT", { locale: "pt-BR", heroTitleA: "Capture já a brecha" }));
    expect(res.status).toBe(200);
    expect(getLandingContent("pt-BR").heroTitleA).toBe("Capture já a brecha");
  });

  it("billing (0C §2.7): 403 para member; owner lista (com sumário) e concilia uma fatura", async () => {
    h.token = await signSession({ ...owner, role: "member" });
    expect((await getBilling()).status).toBe(403);
    h.token = await signSession(owner);
    const list = await getBilling();
    expect(list.status).toBe(200);
    expect((await list.json()).meta.summary).toBeTruthy();
    const open = listInvoices().find((i) => i.status !== "paid");
    expect(open).toBeTruthy();
    const res = await payInvoice(req(`billing/${open!.id}/pay`, "POST"), { params: Promise.resolve({ id: open!.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe("paid");
  });

  it("config por tenant (0C §2.8/2.9): 403 para member; owner edita persona/WhatsApp", async () => {
    const id = listTenants()[0].id;
    h.token = await signSession({ ...owner, role: "member" });
    expect((await putConfig(req(`tenants/${id}/config`, "PUT", { aiPersona: "X" }), { params: Promise.resolve({ id }) })).status).toBe(403);
    h.token = await signSession(owner);
    const res = await putConfig(req(`tenants/${id}/config`, "PUT", { aiPersona: "Nova", whatsapp: "+5511" }), { params: Promise.resolve({ id }) });
    expect(res.status).toBe(200);
    expect(getTenantConfig(id).aiPersona).toBe("Nova");
  });
});
