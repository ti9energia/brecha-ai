import { describe, it, expect } from "vitest";
import { POST } from "./forgot/route";

function req(body: unknown) {
  return new Request("http://localhost/api/auth/forgot", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot", () => {
  it("sempre responde ok com e-mail válido (anti-enumeração)", async () => {
    const res = await POST(req({ email: "alguem@acme.com.br" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.requested).toBe(true);
  });

  it("400 sem e-mail", async () => {
    expect((await POST(req({}))).status).toBe(400);
  });
});
