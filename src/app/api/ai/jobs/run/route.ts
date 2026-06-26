import { runScheduledJobs } from "@/server/ai-core";
import { ok } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// POST /api/ai/jobs/run (0A §4 / 08 §6) — dispara os jobs agendados: sync dos
// connectors de leitura (ingestão no RAG do tenant) + o agente. manager+.
export async function POST(req: Request) {
  const limited = rateLimit(req, "ai-jobs", { max: 10, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("manager", "org_admin", "platform_owner");
  if (gate.error) return gate.error;
  const result = await runScheduledJobs(gate.session.orgId);
  return ok(result, { ran: true });
}
