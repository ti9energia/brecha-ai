// ─────────────────────────────────────────────────────────────────────────────
// AI Core · Memória por usuário (0A §2.3). Lembra os últimos turnos da conversa
// para dar continuidade entre chamadas (copiloto e WhatsApp). In-memory; em
// produção, persistir por user/tenant com TTL, MANTENDO remember/recall.
// ─────────────────────────────────────────────────────────────────────────────
export interface MemoryTurn {
  role: "user" | "assistant";
  content: string;
  at: string;
}

const MEMORY: Record<string, MemoryTurn[]> = {};
const MAX = 20;

export function remember(userId: string, turn: { role: "user" | "assistant"; content: string }): void {
  if (!userId || !turn.content.trim()) return;
  const arr = (MEMORY[userId] ??= []);
  arr.push({ role: turn.role, content: turn.content.slice(0, 4000), at: new Date().toISOString() });
  if (arr.length > MAX) arr.splice(0, arr.length - MAX);
}

export function recall(userId: string, k = 6): MemoryTurn[] {
  return (MEMORY[userId] ?? []).slice(-k);
}

export function memorySize(userId: string): number {
  return MEMORY[userId]?.length ?? 0;
}
