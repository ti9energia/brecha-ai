import { describe, it, expect, afterEach, vi } from "vitest";
import { GET, POST } from "./route";

function post(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/whatsapp/webhook", { method: "POST", headers, body });
}
function get(qs: string) {
  return new Request(`http://localhost/api/whatsapp/webhook?${qs}`);
}

async function sign(body: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return "sha256=" + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

afterEach(() => { vi.unstubAllEnvs(); });

describe("POST /api/whatsapp/webhook — fail-closed", () => {
  it("produção SEM WHATSAPP_APP_SECRET → 503 (recusa mensagens não verificadas)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WHATSAPP_APP_SECRET", "");
    const res = await POST(post(JSON.stringify({ from: "+5511999990000", text: "oi" })));
    expect(res.status).toBe(503);
  });

  it("com segredo + assinatura inválida → 403", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", "s3cr3t");
    const res = await POST(post(JSON.stringify({ from: "+5511999990000", text: "oi" }), { "x-hub-signature-256": "sha256=deadbeef" }));
    expect(res.status).toBe(403);
  });

  it("com segredo + assinatura válida → 200 (processa)", async () => {
    const secret = "s3cr3t";
    vi.stubEnv("WHATSAPP_APP_SECRET", secret);
    const body = JSON.stringify({ from: "+5511999990000", text: "quais janelas abrem?" });
    const res = await POST(post(body, { "x-hub-signature-256": await sign(body, secret) }));
    expect(res.status).toBe(200);
  });

  it("dev SEM segredo → processa (200) — retrocompat do demo", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WHATSAPP_APP_SECRET", "");
    const res = await POST(post(JSON.stringify({ from: "+5511999990000", text: "oi" })));
    expect(res.status).toBe(200);
  });
});

describe("GET /api/whatsapp/webhook — handshake", () => {
  it("dev: token default ecoa o hub.challenge", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "");
    const res = await GET(get("hub.mode=subscribe&hub.verify_token=brecha-verify&hub.challenge=42"));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("42");
  });

  it("produção SEM WHATSAPP_VERIFY_TOKEN → 403 (sem default público)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "");
    const res = await GET(get("hub.mode=subscribe&hub.verify_token=brecha-verify&hub.challenge=42"));
    expect(res.status).toBe(403);
  });
});
