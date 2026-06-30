// Testes do middleware de idempotência (Onda 3 — agora async via KVStore).
import { describe, it, expect, beforeEach } from "vitest";
import { getIdempotent, setIdempotent, idempotencyKey } from "./idempotency";
import { __resetKV } from "@/server/kv/kvStore";

describe("idempotency — KVStore async (Onda 3)", () => {
  beforeEach(() => {
    __resetKV();
  });

  it("getIdempotent devolve null para chave desconhecida", async () => {
    expect(await getIdempotent("chave-nao-existe")).toBeNull();
  });

  it("setIdempotent + getIdempotent round-trip (data + meta)", async () => {
    const data = { status: 200, body: { ok: true } };
    const meta = { source: "test", orgId: "org-x" };
    await setIdempotent("idem-abc", data, meta);

    const entry = await getIdempotent("idem-abc");
    expect(entry).not.toBeNull();
    expect(entry!.data).toEqual(data);
    expect(entry!.meta).toEqual(meta);
  });

  it("setIdempotent aceita meta null", async () => {
    await setIdempotent("idem-null-meta", { ok: 1 }, null);
    const entry = await getIdempotent("idem-null-meta");
    expect(entry).not.toBeNull();
    expect(entry!.meta).toBeNull();
  });

  it("segunda chamada com mesma chave devolve o MESMO resultado (sem re-executar)", async () => {
    const firstResult = { id: "plan-123", status: "created" };
    await setIdempotent("idem-dup", firstResult, null);

    // Simula segunda requisição: deve devolver cached
    const secondResult = await getIdempotent("idem-dup");
    expect(secondResult!.data).toEqual(firstResult);
  });

  it("idempotencyKey extrai header válido", () => {
    const req = new Request("https://x.com/api", {
      headers: { "idempotency-key": "chave-valida-123" },
    });
    expect(idempotencyKey(req)).toBe("chave-valida-123");
  });

  it("idempotencyKey retorna null se header ausente", () => {
    const req = new Request("https://x.com/api");
    expect(idempotencyKey(req)).toBeNull();
  });

  it("idempotencyKey rejeita chave > 200 chars", () => {
    const longKey = "x".repeat(201);
    const req = new Request("https://x.com/api", {
      headers: { "idempotency-key": longKey },
    });
    expect(idempotencyKey(req)).toBeNull();
  });
});
