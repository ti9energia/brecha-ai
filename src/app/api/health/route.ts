import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Health check para orquestradores (Docker/Fly/Render/K8s) e uptime.
// Payload mínimo de propósito: sem versão/config interna (evita recon).
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "brecha-ai",
    time: new Date().toISOString(),
  });
}
