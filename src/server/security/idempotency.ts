// Idempotency-Key (00-PADRÃO §4): repetir a MESMA chave numa janela curta devolve
// o resultado anterior, sem re-executar a escrita.
//
// Onda 3: backed pelo KVStore (in-memory default, Upstash quando KV_URL) para que
// lambdas serverless distintas respeitem a mesma chave de idempotência.
import { getKV } from "@/server/kv/kvStore";

const TTL_MS = 10 * 60 * 1000; // 10 min
const PREFIX = "idem:";

interface IdempotentEntry {
  data: unknown;
  meta: Record<string, unknown> | null;
}

export function idempotencyKey(req: Request): string | null {
  const k = req.headers.get("idempotency-key");
  return k && k.length > 0 && k.length <= 200 ? k : null;
}

export async function getIdempotent(key: string): Promise<IdempotentEntry | null> {
  const raw = await getKV().get(PREFIX + key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as IdempotentEntry;
  } catch {
    return null;
  }
}

export async function setIdempotent(
  key: string,
  data: unknown,
  meta: Record<string, unknown> | null,
): Promise<void> {
  const entry: IdempotentEntry = { data, meta };
  await getKV().set(PREFIX + key, JSON.stringify(entry), TTL_MS);
}
