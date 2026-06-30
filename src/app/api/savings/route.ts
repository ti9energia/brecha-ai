import type { NextRequest } from "next/server";
import { getSavings } from "@/server/domain/store";
import { ok } from "@/server/http";
import { rateLimit } from "@/server/security/rateLimit";

// GET /api/savings — economia capturada + base do success fee.
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, "savings-read", { max: 60, windowMs: 60_000 });
  if (rl) return rl;
  return ok(getSavings());
}
