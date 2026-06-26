import { describe, it, expect, beforeEach, vi } from "vitest";
import { signSession, type SessionUser } from "./session";

// Mock do cookie store do Next (next/headers) — token mutável por teste.
const h = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (_name: string) => (h.token ? { value: h.token } : undefined) }),
}));

import { requireSession, requireRole } from "./guard";

const base: Omit<SessionUser, "exp"> = {
  sub: "u-1", email: "a@acme.com.br", name: "Ana", role: "member", orgId: "org-acme",
};

beforeEach(() => { h.token = undefined; });

describe("guard — RBAC server-side (defesa em profundidade)", () => {
  it("requireSession: 401 sem cookie de sessão", async () => {
    const { session, error } = await requireSession();
    expect(session).toBeNull();
    expect(error?.status).toBe(401);
  });

  it("requireSession: passa com sessão válida", async () => {
    h.token = await signSession(base);
    const { session, error } = await requireSession();
    expect(error).toBeNull();
    expect(session?.sub).toBe("u-1");
  });

  it("requireRole: 403 quando o papel não basta (member numa rota manager+)", async () => {
    h.token = await signSession({ ...base, role: "member" });
    const { session, error } = await requireRole("manager", "org_admin", "platform_owner");
    expect(session).toBeNull();
    expect(error?.status).toBe(403);
  });

  it("requireRole: passa quando o papel basta (manager)", async () => {
    h.token = await signSession({ ...base, role: "manager" });
    const { session, error } = await requireRole("manager", "org_admin", "platform_owner");
    expect(error).toBeNull();
    expect(session?.role).toBe("manager");
  });

  it("requireRole: 401 (não 403) quando não há sessão — checa autenticação antes do papel", async () => {
    const { error } = await requireRole("manager");
    expect(error?.status).toBe(401);
  });
});
