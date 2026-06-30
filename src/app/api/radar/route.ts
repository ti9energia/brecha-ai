import type { NextRequest } from "next/server";
import { getRepository } from "@/server/db/repository";
import { opportunityForNorm } from "@/server/domain/store";
import { ok, paginate } from "@/server/http";
import { rateLimit } from "@/server/security/rateLimit";

const LEVELS = ["federal", "state", "municipal"];

// GET /api/radar — fluxo de mudanças normativas relevantes. Lê pelo seam de
// persistência (Postgres se DATABASE_URL; senão o seed in-memory). Normas são
// imutáveis no app, então é o caminho de leitura mais seguro para o Postgres.
// Onda 6: cada item carrega opportunityId quando há oportunidade detectada,
// para que a view cliente não precise importar store.ts.
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, "radar-read", { max: 120, windowMs: 60_000 });
  if (rl) return rl;
  const sp = req.nextUrl.searchParams;
  const levelP = sp.get("level");
  const rows = await getRepository().listRadar({
    level: LEVELS.includes(levelP ?? "") ? levelP! : undefined,
    sector: sp.get("sector")?.slice(0, 40) ?? undefined,
  });
  // Enriquece cada item com o ID da oportunidade (se existir) para eliminar
  // o import de store nas views cliente.
  const enriched = rows.map((item) => {
    const opp = opportunityForNorm(item.id);
    return opp ? { ...item, opportunityId: opp.id } : item;
  });
  const { page, nextCursor } = paginate(enriched, sp.get("cursor"), Number(sp.get("limit")) || undefined);
  return ok(page, { total: rows.length, nextCursor });
}
