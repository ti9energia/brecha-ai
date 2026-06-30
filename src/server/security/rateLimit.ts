// ─────────────────────────────────────────────────────────────────────────────
// Rate-limit por IP+rota (janela fixa). Usa getKV().incr() para ser multi-
// instância safe: com KV_URL+KV_TOKEN usa Upstash; sem env var usa Map in-memory.
//
// Todas as funções são async — os callers devem `await rateLimit(...)`.
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { getKV } from "@/server/kv/kvStore";

// NOTA de confiança: atrás de um proxy gerenciado (Vercel), x-forwarded-for é
// definido pela plataforma. Um cliente direto pode forjá-lo — por isso rotas
// sensíveis também limitam por sujeito (e-mail/usuário) via `rateLimitBy`, o que
// não depende do IP.
function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function tooMany(windowMs: number): NextResponse {
  const retry = Math.max(1, Math.ceil(windowMs / 1000));
  return NextResponse.json(
    { data: null, meta: null, error: { code: "RATE_LIMITED", messageKey: "errors.rate_limited" } },
    { status: 429, headers: { "Retry-After": String(retry) } },
  );
}

/** Núcleo: incrementa o bucket via KV; retorna 429 quando estoura, ou null. */
async function hit(key: string, opts: { max: number; windowMs: number }): Promise<NextResponse | null> {
  const count = await getKV().incr(key, 1, opts.windowMs);
  if (count > opts.max) return tooMany(opts.windowMs);
  return null;
}

/** Limite por IP+rota. Coarse — combine com `rateLimitBy` em rotas sensíveis. */
export async function rateLimit(
  req: Request,
  bucket: string,
  opts: { max: number; windowMs: number },
): Promise<NextResponse | null> {
  return hit(`${bucket}:${clientIp(req)}`, opts);
}

/** Limite por sujeito (e-mail, id de usuário) — resiste à rotação de IP. */
export async function rateLimitBy(
  subject: string,
  bucket: string,
  opts: { max: number; windowMs: number },
): Promise<NextResponse | null> {
  return hit(`${bucket}:${subject}`, opts);
}
