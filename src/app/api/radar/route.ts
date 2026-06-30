import type { NextRequest } from "next/server";
import { getRepository } from "@/server/db/repository";
import { ok, paginate } from "@/server/http";
import { rateLimit } from "@/server/security/rateLimit";

const LEVELS = ["federal", "state", "municipal"];

// GET /api/radar — fluxo de mudanças normativas relevantes. Lê pelo seam de
// persistência (Postgres se DATABASE_URL; senão o seed in-memory). Normas são
// imutáveis no app, então é o caminho de leitura mais seguro para o Postgres.
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, "radar-read", { max: 120, windowMs: 60_000 });
  if (rl) return rl;
  const sp = req.nextUrl.searchParams;
  const levelP = sp.get("level");
  const rows = await getRepository().listRadar({
    level: LEVELS.includes(levelP ?? "") ? levelP! : undefined,
    sector: sp.get("sector")?.slice(0, 40) ?? undefined,
  });
  const { page, nextCursor } = paginate(rows, sp.get("cursor"), Number(sp.get("limit")) || undefined);
  return ok(page, { total: rows.length, nextCursor });
}
