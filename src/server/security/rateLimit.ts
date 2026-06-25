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

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function prune(now: number) {
  if (store.size < 5000) return;
  for (const [k, b] of store) if (now > b.resetAt) store.delete(k);
}

/** Retorna 429 quando estourou o limite, ou null para seguir. */
export function rateLimit(
  req: Request,
  bucket: string,
  opts: { max: number; windowMs: number },
): NextResponse | null {
  const now = Date.now();
  prune(now);
  const key = `${bucket}:${clientIp(req)}`;
  const b = store.get(key);

  if (!b || now > b.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }
  if (b.count >= opts.max) {
    const retry = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    return NextResponse.json(
      { data: null, meta: null, error: { code: "RATE_LIMITED", messageKey: "errors.rate_limited" } },
      { status: 429, headers: { "Retry-After": String(retry), "X-RateLimit-Reset": String(b.resetAt) } },
    );
  }
  b.count++;
  return null;
}
