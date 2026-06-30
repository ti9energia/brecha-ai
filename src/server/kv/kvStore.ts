// ─────────────────────────────────────────────────────────────────────────────
// KV Store abstraction (Onda 3). Permite que rateLimit, idempotency e memory
// sobrevivam entre invocações serverless (lambdas não partilham memória).
//
// default  → Map in-memory (zero-config, testes, desenvolvimento local)
// KV_URL   → Upstash Redis / Vercel KV via REST API (// SWAP produção)
//
// Interface intencional mínima: get/set/del + incr para contadores atómicos.
// O TTL é passado em cada set() para que o KV remoto expire automaticamente.
// ─────────────────────────────────────────────────────────────────────────────

export interface KVStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Incrementa atomicamente por delta (default 1) e devolve o novo valor. TTL aplica-se apenas na primeira criação. */
  incr(key: string, delta: number, ttlMs: number): Promise<number>;
}

// ── Implementação in-memory (default zero-config) ─────────────────────────────

interface Entry {
  value: string;
  expiresAt: number | null; // null = sem expiração
}

class InMemoryKV implements KVStore {
  private store = new Map<string, Entry>();

  private prune() {
    if (this.store.size < 10_000) return;
    const now = Date.now();
    for (const [k, v] of this.store) {
      if (v.expiresAt !== null && now > v.expiresAt) this.store.delete(k);
    }
  }

  async get(key: string): Promise<string | null> {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expiresAt !== null && Date.now() > e.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return e.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    this.prune();
    this.store.set(key, {
      value,
      expiresAt: ttlMs != null ? Date.now() + ttlMs : null,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string, delta: number, ttlMs: number): Promise<number> {
    const e = this.store.get(key);
    const now = Date.now();
    const expired = e?.expiresAt != null && now > e.expiresAt;
    if (!e || expired) {
      this.store.set(key, { value: String(delta), expiresAt: now + ttlMs });
      return delta;
    }
    const next = (parseInt(e.value, 10) || 0) + delta;
    e.value = String(next);
    return next;
  }
}

// ── Implementação Upstash Redis via REST API (// SWAP produção) ───────────────
// Ativa com KV_URL=https://<host>.upstash.io e KV_TOKEN=<token>.
// Compatível com Vercel KV (Upstash Redis REST).

class UpstashKV implements KVStore {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, "");
    this.token = token;
  }

  private async cmd<T = unknown>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(`${this.url}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`Upstash KV error: ${res.status}`);
    const json = (await res.json()) as { result: T };
    return json.result;
  }

  async get(key: string): Promise<string | null> {
    const v = await this.cmd<string | null>("GET", key);
    return v ?? null;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (ttlMs != null) {
      const pxMs = Math.ceil(ttlMs);
      await this.cmd("SET", key, value, "PX", pxMs);
    } else {
      await this.cmd("SET", key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.cmd("DEL", key);
  }

  async incr(key: string, delta: number, ttlMs: number): Promise<number> {
    // INCRBY + PEXPIRE num pipeline (array de comandos Upstash)
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCRBY", key, delta],
        ["PEXPIRE", key, Math.ceil(ttlMs)],
      ]),
    });
    if (!res.ok) throw new Error(`Upstash KV pipeline error: ${res.status}`);
    const json = (await res.json()) as [{ result: number }];
    return json[0].result;
  }
}

// ── Singleton do processo ─────────────────────────────────────────────────────

let _kv: KVStore | null = null;

/**
 * getKV() — devolve o KVStore configurado.
 * - KV_URL + KV_TOKEN presentes → Upstash Redis (produção/Vercel KV)
 * - caso contrário → Map in-memory (demo / CI)
 */
export function getKV(): KVStore {
  if (!_kv) {
    const url = process.env.KV_URL;
    const token = process.env.KV_TOKEN;
    if (url && token) {
      _kv = new UpstashKV(url, token);
    } else {
      _kv = new InMemoryKV();
    }
  }
  return _kv;
}

/** Para testes: reseta o singleton. */
export function __resetKV(): void {
  _kv = null;
}
