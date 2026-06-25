import { listConnectors } from "@/server/ai-core";
import { ok } from "@/server/http";
import { requireRole } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

// GET /api/ai/connectors — catálogo de connectors do AI Core (0A §2.5/§2.9).
// Configuração de plataforma → restrito ao platform_owner (0C §6).
export async function GET() {
  const { error } = await requireRole("platform_owner");
  if (error) return error;
  const data = listConnectors().map((c) => ({
    id: c.id,
    label: c.label,
    capabilities: c.capabilities,
    status: c.status(),
  }));
  return ok(data);
}
