import type { NextRequest } from "next/server";
import { getRepository } from "@/server/db/repository";
import { ok } from "@/server/http";
import { rateLimit } from "@/server/security/rateLimit";

// GET /api/savings — economia capturada + base do success fee.
// Passado pelo seam do repositório para que DATABASE_URL troque o backing store sem
// reescrever a rota (0D §2 — split-brain prevention).
export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, "savings-read", { max: 60, windowMs: 60_000 });
  if (rl) return rl;
  return ok(await getRepository().getSavings());
}
