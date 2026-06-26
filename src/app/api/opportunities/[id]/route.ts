import { getRepository } from "@/server/db/repository";
import { ok, fail } from "@/server/http";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const opp = await getRepository().getOpportunity(id);
  if (!opp) return fail("OPPORTUNITY_NOT_FOUND", "errors.not_found", 404);
  return ok(opp);
}
