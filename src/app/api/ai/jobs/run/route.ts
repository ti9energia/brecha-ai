import { runScheduledJobs } from "@/server/ai-core";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";
import { verifySession, SESSION_COOKIE } from "@/server/auth/session";
import { cookies } from "next/headers";

// POST /api/ai/jobs/run (0A §4 / 08 §6) — dispara os jobs agendados: sync dos
// connectors de leitura (ingestão no RAG do tenant) + o agente. Aceita dois
// modos de autenticação:
//
//   1. Vercel Cron (Onda 3): header `Authorization: Bearer <CRON_SECRET>` —
//      o Vercel injeta automaticamente em invocações cron. Sem sessão de usuário;
//      corre sob o orgId padrão (org-acme) como job de plataforma.
//
//   2. Humano (manager+): cookie de sessão com role manager/org_admin/platform_owner —
//      para disparar manualmente via UI ou API.
export async function POST(req: Request) {
  const limited = await rateLimit(req, "ai-jobs", { max: 10, windowMs: 60_000 });
  if (limited) return limited;

  // Verificar autenticação cron primeiro (mais rápido, sem cookie overhead)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (isCron) {
    // Cron invocado pelo Vercel — roda o job para o tenant padrão
    const result = await runScheduledJobs("org-acme");
    return ok(result, { ran: true, trigger: "cron" });
  }

  // Fallback: autenticação por sessão de usuário (manager+)
  const gate = await requireRole("manager", "org_admin", "platform_owner");
  if (gate.error) return gate.error;

  const result = await runScheduledJobs(gate.session.orgId);
  return ok(result, { ran: true, trigger: "manual" });
}
