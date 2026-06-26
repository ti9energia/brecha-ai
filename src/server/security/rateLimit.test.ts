import { describe, it, expect } from "vitest";
import { rateLimit, rateLimitBy } from "./rateLimit";

const req = (ip = "1.2.3.4") =>
  new Request("http://x/", { headers: { "x-forwarded-for": ip } });

describe("rateLimit", () => {
  it("libera até o limite e então retorna 429", () => {
    const opts = { max: 3, windowMs: 60_000 };
    expect(rateLimit(req(), "rl-a", opts)).toBeNull();
    expect(rateLimit(req(), "rl-a", opts)).toBeNull();
    expect(rateLimit(req(), "rl-a", opts)).toBeNull();
    const blocked = rateLimit(req(), "rl-a", opts);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("Retry-After")).toBeTruthy();
  });

  it("chaveia por IP — IPs distintos têm buckets separados", () => {
    const opts = { max: 1, windowMs: 60_000 };
    expect(rateLimit(req("9.9.9.9"), "rl-ip", opts)).toBeNull();
    expect(rateLimit(req("9.9.9.9"), "rl-ip", opts)).not.toBeNull(); // 2º do mesmo IP barra
    expect(rateLimit(req("8.8.8.8"), "rl-ip", opts)).toBeNull(); // outro IP segue
  });

  it("usa o primeiro IP do x-forwarded-for", () => {
    const r = new Request("http://x/", { headers: { "x-forwarded-for": "5.5.5.5, 10.0.0.1" } });
    const opts = { max: 1, windowMs: 60_000 };
    expect(rateLimit(r, "rl-xff", opts)).toBeNull();
    // mesmo IP-cliente (5.5.5.5) → barra no 2º
    expect(rateLimit(new Request("http://x/", { headers: { "x-forwarded-for": "5.5.5.5" } }), "rl-xff", opts)).not.toBeNull();
  });
});

describe("rateLimitBy", () => {
  it("chaveia por sujeito (resiste à rotação de IP)", () => {
    const opts = { max: 2, windowMs: 60_000 };
    expect(rateLimitBy("alvo@acme.com.br", "rl-subj", opts)).toBeNull();
    expect(rateLimitBy("alvo@acme.com.br", "rl-subj", opts)).toBeNull();
    expect(rateLimitBy("alvo@acme.com.br", "rl-subj", opts)).not.toBeNull(); // 3º barra
    expect(rateLimitBy("outro@acme.com.br", "rl-subj", opts)).toBeNull(); // sujeito distinto segue
  });
});
