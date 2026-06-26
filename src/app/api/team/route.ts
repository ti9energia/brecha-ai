import { listUsers } from "@/server/auth/users";
import { ok } from "@/server/http";
import { requireSession } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

// GET /api/team — equipe da ORG da sessão (qualquer papel logado vê os colegas).
// Escopado por orgId; `listUsers()` nunca expõe o hash de senha. É a fonte real
// que substitui o mock visual de "Equipe & papéis" em Configurações.
export async function GET() {
  const gate = await requireSession();
  if (gate.error) return gate.error;
  const team = listUsers().filter((u) => u.orgId === gate.session.orgId);
  return ok(team);
}
