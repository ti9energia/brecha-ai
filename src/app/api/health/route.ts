import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Health check para orquestradores (Docker/Fly/Render/K8s) e uptime.
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "brecha-ai",
    version: process.env.npm_package_version ?? "1.0.0",
    aiCore: process.env.ANTHROPIC_API_KEY ? "claude" : "local-brain",
    time: new Date().toISOString(),
  });
}
