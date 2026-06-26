import { describe, it, expect, beforeEach, vi } from "vitest";
import { signSession, type SessionUser } from "@/server/auth/session";

// As escritas de org (PUT /structure, PUT /settings) exigem manager+. Este teste
// trava a correção de broken-access-control: antes, qualquer sessão (viewer/member)
// sobrescrevia regime/faturamento/persona/WhatsApp. Mock do cookie store do Next.
const h = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (_name: string) => (h.token ? { value: h.token } : undefined) }),
}));

import { GET as getStructure, PUT as putStructure } from "./structure/route";
import { PUT as putSettings } from "./settings/route";

const base: Omit<SessionUser, "exp"> = {
  sub: "u-1", email: "a@acme.com.br", name: "Ana", role: "manager", orgId: "org-acme",
};

function putReq(path: string, body: unknown) {
  return new Request(`http://localhost/api/${path}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => { h.token = undefined; });

describe("PUT /api/structure — RBAC", () => {
  it("GET (com sessão) devolve o perfil do tenant", async () => {
    h.token = await signSession(base);
    const res = await getStructure();
    const json = await res.json();
    expect(json.data).toBeTruthy();
    expect(json.error).toBeNull();
  });

  it("401 sem sessão", async () => {
    const res = await putStructure(putReq("structure", { regime: "X" }));
    expect(res.status).toBe(401);
  });

  it("403 para member (não pode escrever a estrutura)", async () => {
    h.token = await signSession({ ...base, role: "member" });
    const res = await putStructure(putReq("structure", { legalName: "Hacker LTDA" }));
    expect(res.status).toBe(403);
  });

  it("200 para manager e persiste o patch coagido", async () => {
    h.token = await signSession({ ...base, role: "manager" });
    const res = await putStructure(putReq("structure", { regime: "Lucro Presumido" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.regime).toBe("Lucro Presumido");
    expect(json.meta?.saved).toBe(true);
  });
});

describe("PUT /api/settings — RBAC", () => {
  it("403 para member", async () => {
    h.token = await signSession({ ...base, role: "member" });
    const res = await putSettings(putReq("settings", { orgName: "Pwned" }));
    expect(res.status).toBe(403);
  });

  it("200 para org_admin e persiste", async () => {
    h.token = await signSession({ ...base, role: "org_admin" });
    const res = await putSettings(putReq("settings", { orgName: "Acme Holding" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.orgName).toBe("Acme Holding");
  });
});
