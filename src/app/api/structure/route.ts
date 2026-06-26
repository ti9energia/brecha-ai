import { getStructure, updateStructure } from "@/server/domain/store";
import { ok } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET/PUT /api/structure — perfil fiscal/jurídico do cliente.
export async function GET() {
  return ok(getStructure());
}

export async function PUT(req: Request) {
  const limited = rateLimit(req, "structure", { max: 30, windowMs: 60_000 });
  if (limited) return limited;

  // Escrita = manager+ (espelha a tool `structure:update`, tools.ts WRITERS).
  // Sem isto, qualquer sessão (viewer/member) sobrescreveria regime/faturamento/UFs.
  const gate = await requireRole("manager", "org_admin", "platform_owner");
  if (gate.error) return gate.error;

  // Aceita só campos conhecidos (sem mass-assignment), coage tipos e PERSISTE.
  const patch = await req.json().catch(() => ({}));
  const saved = updateStructure(patch && typeof patch === "object" ? (patch as Record<string, unknown>) : {});
  return ok(saved, { saved: true });
}
