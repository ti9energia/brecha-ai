// ─────────────────────────────────────────────────────────────────────────────
// Rate-limit por IP+rota (janela fixa, in-memory). Dependency-free.
// Em produção multi-instância, trocar o `store` por Upstash/Vercel KV
// (mesma interface) para limite global consistente entre lambdas.
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}
const store = new Map<string, Bucket>();

// NOTA de confiança: atrás de um proxy gerenciado (Vercel), x-forwarded-for é
// definido pela plataforma. Um cliente direto pode forjá-lo — por isso rotas
// sensíveis também limitam por sujeito (e-mail/usuário) via `rateLimitBy`, o que
// não depende do IP. Em produção multi-instância, trocar o `store` por KV.
function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function prune(now: number) {
  if (store.size < 5000) return;
  for (const [k, b] of store) if (now > b.resetAt) store.delete(k);
}

function tooMany(resetAt: number, now: number): NextResponse {
  const retry = Math.max(1, Math.ceil((resetAt - now) / 1000));
  return NextResponse.json(
    { data: null, meta: null, error: { code: "RATE_LIMITED", messageKey: "errors.rate_limited" } },
    { status: 429, headers: { "Retry-After": String(retry), "X-RateLimit-Reset": String(resetAt) } },
  );
}

/** Núcleo: incrementa o bucket `key`; retorna 429 quando estoura, ou null para seguir. */
function hit(key: string, opts: { max: number; windowMs: number }): NextResponse | null {
  const now = Date.now();
  prune(now);
  const b = store.get(key);

  if (!b || now > b.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }
  if (b.count >= opts.max) return tooMany(b.resetAt, now);
  b.count++;
  return null;
}

/** Limite por IP+rota. Coarse — combine com `rateLimitBy` em rotas sensíveis. */
export function rateLimit(
  req: Request,
  bucket: string,
  opts: { max: number; windowMs: number },
): NextResponse | null {
  return hit(`${bucket}:${clientIp(req)}`, opts);
}

/** Limite por sujeito (e-mail, id de usuário) — resiste à rotação de IP. */
export function rateLimitBy(
  subject: string,
  bucket: string,
  opts: { max: number; windowMs: number },
): NextResponse | null {
  return hit(`${bucket}:${subject}`, opts);
}
