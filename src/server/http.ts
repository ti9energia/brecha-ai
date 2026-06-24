import { NextResponse } from "next/server";

// Envelope padrão (00-PADRAO §4): { data, meta, error }.
export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, meta: meta ?? null, error: null });
}

export function fail(code: string, messageKey: string, status = 400) {
  return NextResponse.json({ data: null, meta: null, error: { code, messageKey } }, { status });
}
