import { describe, it, expect, beforeEach, vi } from "vitest";
import { signSession, type SessionUser } from "@/server/auth/session";

// Integração ponta a ponta: o Agente Autônomo abre brechas (cruzando o perfil da
// empresa com as normas) e o DETALHE da brecha aberta é recuperável pela rota real —
// prova que detecção → oportunidade → detalhe funciona pelo caminho HTTP de verdade.
const h = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (h.token ? { value: h.token } : undefined) }),
}));

import { POST as runAgent } from "./route";
import { GET as getOpportunity } from "@/app/api/opportunities/[id]/route";

const base: Omit<SessionUser, "exp"> = {
  sub: "u-1", email: "a@acme.com.br", name: "Ana", role: "manager", orgId: "org-acme",
};

function postReq() {
  return new Request("http://localhost/api/ai/agent/run", { method: "POST" });
}

beforeEach(() => { h.token = undefined; });

describe("POST /api/ai/agent/run — detecção de brechas ponta a ponta", () => {
  it("401 sem sessão", async () => {
    const res = await runAgent(postReq());
    expect(res.status).toBe(401);
  });

  it("abre brechas (new_opportunity) e o detalhe abre via /api/opportunities/:id", async () => {
    h.token = await signSession(base);
    const res = await runAgent(postReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    const brecha = (json.data as { kind: string; opportunityId?: string }[]).find((r) => r.kind === "new_opportunity");
    expect(brecha, "o agente deve abrir ao menos uma brecha nova").toBeTruthy();
    expect(brecha!.opportunityId).toBeTruthy();

    // o detalhe da brecha aberta abre de verdade — com a norma-gatilho e a jogada.
    const detail = await getOpportunity(new Request("http://localhost"), {
      params: Promise.resolve({ id: brecha!.opportunityId! }),
    });
    expect(detail.status).toBe(200);
    const dj = await detail.json();
    expect(dj.data.id).toBe(brecha!.opportunityId);
    expect(dj.data.norm).toBeTruthy(); // a norma que disparou a brecha veio junto
    expect(dj.data.recommendedMove.rationale.length).toBeGreaterThan(0);
  });
});
