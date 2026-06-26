import { getRepository } from "@/server/db/repository";
import { ok } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET/PUT /api/structure — perfil fiscal/jurídico do cliente, via seam de persistência
// (leitura E escrita no mesmo backing store: in-memory por padrão, Postgres se DATABASE_URL).
export async function GET() {
  return ok(await getRepository().getStructure());
}

export async function PUT(req: Request) {
  const limited = rateLimit(req, "structure", { max: 30, windowMs: 60_000 });
  if (limited) return limited;

  // Escrita = manager+ (espelha a tool `structure:update`, tools.ts WRITERS).
  const gate = await requireRole("manager", "org_admin", "platform_owner");
  if (gate.error) return gate.error;

  // Aceita só campos conhecidos (sem mass-assignment), coage tipos e PERSISTE.
  const patch = await req.json().catch(() => ({}));
  const saved = await getRepository().updateStructure(patch && typeof patch === "object" ? (patch as Record<string, unknown>) : {});
  return ok(saved, { saved: true });
}
