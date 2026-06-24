import { getSavings } from "@/server/domain/store";
import { ok } from "@/server/http";

// GET /api/savings — economia capturada + base do success fee.
export async function GET() {
  return ok(getSavings());
}
