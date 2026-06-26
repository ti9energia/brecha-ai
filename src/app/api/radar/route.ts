import type { NextRequest } from "next/server";
import { getRepository } from "@/server/db/repository";
import { ok } from "@/server/http";

const LEVELS = ["federal", "state", "municipal"];

// GET /api/radar — fluxo de mudanças normativas relevantes. Lê pelo seam de
// persistência (Postgres se DATABASE_URL; senão o seed in-memory). Normas são
// imutáveis no app, então é o caminho de leitura mais seguro para o Postgres.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const levelP = sp.get("level");
  const rows = await getRepository().listRadar({
    level: LEVELS.includes(levelP ?? "") ? levelP! : undefined,
    sector: sp.get("sector")?.slice(0, 40) ?? undefined,
  });
  return ok(rows, { total: rows.length });
}
