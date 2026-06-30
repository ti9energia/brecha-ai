// ─────────────────────────────────────────────────────────────────────────────
// AI Core · Memória por usuário (0A §2.3). Lembra os últimos turnos da conversa
// para dar continuidade entre chamadas (copiloto e WhatsApp).
//
// Onda 3: backed pelo KVStore (in-memory default, Upstash quando KV_URL) para que
// lambdas serverless distintas partilhem a mesma memória por utilizador.
// ─────────────────────────────────────────────────────────────────────────────
import { getKV } from "@/server/kv/kvStore";

export interface MemoryTurn {
  role: "user" | "assistant";
  content: string;
  at: string;
}

const PREFIX = "mem:";
const MAX = 20;
const TTL_MS = 60 * 60 * 1000; // 1 hora

export async function remember(
  userId: string,
  turn: { role: "user" | "assistant"; content: string },
): Promise<void> {
  if (!userId || !turn.content.trim()) return;
  const kv = getKV();
  const key = PREFIX + userId;
  const raw = await kv.get(key);
  const arr: MemoryTurn[] = raw ? (JSON.parse(raw) as MemoryTurn[]) : [];
  arr.push({ role: turn.role, content: turn.content.slice(0, 4000), at: new Date().toISOString() });
  if (arr.length > MAX) arr.splice(0, arr.length - MAX);
  await kv.set(key, JSON.stringify(arr), TTL_MS);
}

export async function recall(userId: string, k = 6): Promise<MemoryTurn[]> {
  const kv = getKV();
  const raw = await kv.get(PREFIX + userId);
  if (!raw) return [];
  const arr = JSON.parse(raw) as MemoryTurn[];
  return arr.slice(-k);
}

export async function memorySize(userId: string): Promise<number> {
  const kv = getKV();
  const raw = await kv.get(PREFIX + userId);
  if (!raw) return 0;
  return (JSON.parse(raw) as MemoryTurn[]).length;
}
