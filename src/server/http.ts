import { NextResponse } from "next/server";

// Envelope padrão (00-PADRAO §4): { data, meta, error }.
export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, meta: meta ?? null, error: null });
}

export function fail(code: string, messageKey: string, status = 400) {
  return NextResponse.json({ data: null, meta: null, error: { code, messageKey } }, { status });
}

// Paginação por cursor opaco (00-PADRÃO §4). O cursor codifica o offset (base64);
// em produção, keyset (id + sortKey). Limite default 50, teto 100.
export function paginate<T>(rows: T[], cursor: string | null, limit?: number): { page: T[]; nextCursor: string | null } {
  const lim = Math.min(Math.max(1, limit || 50), 100);
  let start = 0;
  if (cursor) {
    try {
      start = Math.max(0, parseInt(atob(cursor), 10) || 0);
    } catch {
      start = 0;
    }
  }
  const page = rows.slice(start, start + lim);
  const next = start + lim;
  return { page, nextCursor: next < rows.length ? btoa(String(next)) : null };
}
