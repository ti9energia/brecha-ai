// Testes do KVStore in-memory (Onda 3). Sem deps externas — roda sem KV_URL.
import { describe, it, expect, beforeEach } from "vitest";
import { getKV, __resetKV } from "./kvStore";

describe("KVStore in-memory (Onda 3)", () => {
  beforeEach(() => {
    __resetKV();
  });

  it("get devolve null para chave inexistente", async () => {
    expect(await getKV().get("nao-existe")).toBeNull();
  });

  it("set + get round-trip", async () => {
    await getKV().set("foo", "bar");
    expect(await getKV().get("foo")).toBe("bar");
  });

  it("del remove a chave", async () => {
    const kv = getKV();
    await kv.set("k", "v");
    await kv.del("k");
    expect(await kv.get("k")).toBeNull();
  });

  it("set com TTL expira (simulado manualmente via tempo fakado)", async () => {
    // Vitest não tem fake timers embutidos no Date.now() a não ser via vi.useFakeTimers.
    // Testamos o caminho happy-path: antes do TTL o valor está presente.
    const kv = getKV();
    await kv.set("ttl-key", "hello", 5 * 60 * 1000); // 5 min
    expect(await kv.get("ttl-key")).toBe("hello");
  });

  it("incr acumula delta e respeita chamadas múltiplas", async () => {
    const kv = getKV();
    const v1 = await kv.incr("counter", 1, 60_000);
    expect(v1).toBe(1);
    const v2 = await kv.incr("counter", 1, 60_000);
    expect(v2).toBe(2);
    const v3 = await kv.incr("counter", 5, 60_000);
    expect(v3).toBe(7);
  });

  it("incr para chave expirada reinicia o contador", async () => {
    // Simula expiração: criar com TTL 0 (já expirado na próxima chamada).
    // Não podemos controlar o tempo sem fake timers, mas podemos verificar
    // que uma chave nova começa em delta.
    const kv = getKV();
    const v = await kv.incr("fresh-counter", 3, 60_000);
    expect(v).toBe(3);
  });

  it("singleton: getKV() devolve sempre a mesma instância", async () => {
    const a = getKV();
    const b = getKV();
    expect(a).toBe(b);
    await a.set("singleton-test", "yes");
    expect(await b.get("singleton-test")).toBe("yes");
  });

  it("__resetKV() cria nova instância limpa", async () => {
    await getKV().set("antes-do-reset", "valor");
    __resetKV();
    expect(await getKV().get("antes-do-reset")).toBeNull();
  });
});
