import { getSettings, updateSettings } from "@/server/domain/store";
import { ok } from "@/server/http";

// GET/PUT /api/settings — configurações da org (nome, idioma, fuso, persona da IA,
// tom, WhatsApp, setores e jurisdições monitorados). Coage e persiste in-memory.
export async function GET() {
  return ok(getSettings());
}

export async function PUT(req: Request) {
  const patch = await req.json().catch(() => ({}));
  const saved = updateSettings(patch && typeof patch === "object" ? (patch as Record<string, unknown>) : {});
  return ok(saved, { saved: true });
}
