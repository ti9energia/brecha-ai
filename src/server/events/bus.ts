// ─────────────────────────────────────────────────────────────────────────────
// Event bus in-memory (0D §5) — pub/sub inter-módulos desacoplado. Um módulo emite,
// outros reagem sem se conhecerem. SWAP (produção): Vercel Queues / Kafka mantendo
// a mesma interface on/emit. Falha de um subscriber não derruba os demais.
// ─────────────────────────────────────────────────────────────────────────────
export type DomainEvent =
  | "execution.approved"
  | "tenant.created"
  | "tenant.status_changed"
  | "plan.updated"
  | "opportunity.simulated"
  | "savings.reconciled";

type Handler<T = unknown> = (payload: T) => void;
const handlers = new Map<string, Set<Handler>>();

/** Inscreve um handler; retorna a função de cancelamento. */
export function on<T = unknown>(event: DomainEvent, handler: Handler<T>): () => void {
  let set = handlers.get(event);
  if (!set) handlers.set(event, (set = new Set()));
  set.add(handler as Handler);
  return () => handlers.get(event)?.delete(handler as Handler);
}

/** Emite um evento para todos os inscritos; retorna quantos foram notificados. */
export function emit<T = unknown>(event: DomainEvent, payload: T): number {
  const set = handlers.get(event);
  if (!set) return 0;
  for (const h of [...set]) {
    try {
      h(payload);
    } catch {
      /* isola a falha do subscriber — o emissor não deve quebrar */
    }
  }
  return set.size;
}

export function eventNames(): string[] {
  return [...handlers.keys()];
}
