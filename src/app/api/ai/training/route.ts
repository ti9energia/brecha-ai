import { trainingPipeline } from "@/server/ai-core";
import { ok } from "@/server/http";
import { requireRole } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

// GET /api/ai/training (0A §2.7) — estado do pipeline de treino (coleta→curadoria→
// eval→versão), derivado do feedback capturado. manager+.
export async function GET() {
  const gate = await requireRole("manager", "org_admin", "platform_owner");
  if (gate.error) return gate.error;
  return ok(trainingPipeline());
}
