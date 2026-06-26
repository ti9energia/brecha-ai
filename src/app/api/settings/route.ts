import { getSettings, updateSettings } from "@/server/domain/store";
import { ok } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET/PUT /api/settings — configurações da org (nome, idioma, fuso, persona da IA,
// tom, WhatsApp, setores e jurisdições monitorados). Coage e persiste in-memory.
export async function GET() {
  return ok(getSettings());
}

export async function PUT(req: Request) {
  const limited = rateLimit(req, "settings", { max: 30, windowMs: 60_000 });
  if (limited) return limited;

  // Escrita de configuração da org = manager+ (mesma fronteira de `structure:update`).
  // Evita que viewer/member troque nome da org, persona da IA ou número de WhatsApp.
  const gate = await requireRole("manager", "org_admin", "platform_owner");
  if (gate.error) return gate.error;

  const patch = await req.json().catch(() => ({}));
  const saved = updateSettings(patch && typeof patch === "object" ? (patch as Record<string, unknown>) : {});
  return ok(saved, { saved: true });
}
