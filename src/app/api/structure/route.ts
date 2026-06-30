import { getRepository } from "@/server/db/repository";
import { ok } from "@/server/http";
import { requireRole, requireSession } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET/PUT /api/structure — perfil fiscal/jurídico do cliente, via seam de persistência
// e ESCOPADO POR TENANT (orgId da sessão). Ao impersonar outro tenant, mostra/edita a
// estrutura daquele tenant. Leitura E escrita no mesmo backing store (sem split-brain).
export async function GET() {
  const gate = await requireSession();
  if (gate.error) return gate.error;
  return ok(await getRepository().getStructure(gate.session.orgId));
}

export async function PUT(req: Request) {
  const limited = await rateLimit(req, "structure", { max: 30, windowMs: 60_000 });
  if (limited) return limited;

  // Escrita = manager+ (espelha a tool `structure:update`, tools.ts WRITERS).
  const gate = await requireRole("manager", "org_admin", "platform_owner");
  if (gate.error) return gate.error;

  // Aceita só campos conhecidos (sem mass-assignment), coage tipos e PERSISTE no tenant.
  const patch = await req.json().catch(() => ({}));
  const saved = await getRepository().updateStructure(
    patch && typeof patch === "object" ? (patch as Record<string, unknown>) : {},
    gate.session.orgId,
  );
  return ok(saved, { saved: true });
}
