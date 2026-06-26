// Idempotency-Key (00-PADRÃO §4): repetir a MESMA chave numa janela curta devolve
// o resultado anterior, sem re-executar a escrita. In-memory; em produção, KV+TTL.
interface Entry {
  at: number;
  data: unknown;
  meta: Record<string, unknown> | null;
}
const STORE = new Map<string, Entry>();
const TTL = 10 * 60 * 1000;

export function idempotencyKey(req: Request): string | null {
  const k = req.headers.get("idempotency-key");
  return k && k.length > 0 && k.length <= 200 ? k : null;
}

export function getIdempotent(key: string): Entry | null {
  const e = STORE.get(key);
  if (!e) return null;
  if (Date.now() - e.at > TTL) {
    STORE.delete(key);
    return null;
  }
  return e;
}

export function setIdempotent(key: string, data: unknown, meta: Record<string, unknown> | null): void {
  if (STORE.size > 5000) STORE.clear();
  STORE.set(key, { at: Date.now(), data, meta });
}
