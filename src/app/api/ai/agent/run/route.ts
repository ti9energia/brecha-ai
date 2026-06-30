import { cookies } from "next/headers";
import { agentRun } from "@/server/ai-core/agent";
import { anthropicProvider } from "@/server/ai-core/provider";
import { askClaudeText } from "@/server/ai/claude";
import { enrichBrecha } from "@/server/ai/detector-llm";
import { getOpportunity, getNorm, getStructure, applyEnrichedBrecha } from "@/server/domain/store";
import { resolveLocale } from "@/i18n/config";
import { ok, fail } from "@/server/http";
import { rateLimit } from "@/server/security/rateLimit";
import { verifySession, SESSION_COOKIE } from "@/server/auth/session";

// POST /api/ai/agent/run — dispara o Agente Autônomo sobre os dados ao vivo (0A §2.9):
// abre as brechas relevantes (cruzando o perfil da empresa com as normas) e devolve a
// fila de recomendações. Cada run é auditado.
export async function POST(req: Request) {
  const limited = await rateLimit(req, "agent-run", { max: 30, windowMs: 60_000 });
  if (limited) return limited;
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return fail("UNAUTHENTICATED", "auth.unauthenticated", 401);

  // Locale do usuário (corpo do POST) → recomendações nos 4 idiomas (00-PADRÃO §6).
  const body = (await req.json().catch(() => ({}))) as { locale?: string };
  const locale = resolveLocale(body?.locale);
  const recs = agentRun(new Date(), locale);

  // Refino OPCIONAL pelo Claude estruturado (0A §2.1): sem ANTHROPIC_API_KEY, a fila já
  // está pronta (determinística). Com chave, o modelo reescreve a jogada de cada brecha
  // nova (linguagem/justificativa) no idioma do usuário — os NÚMEROS da simulação ficam
  // intactos (não inventa valores). Falha por brecha cai na versão determinística.
  if (anthropicProvider.available()) {
    const st = getStructure();
    for (const r of recs) {
      if (r.kind !== "new_opportunity" || !r.opportunityId) continue;
      const opp = getOpportunity(r.opportunityId);
      const n = opp ? getNorm(opp.normId) : undefined;
      if (!opp || !n) continue;
      const enriched = await enrichBrecha(opp, n, st, locale, askClaudeText);
      applyEnrichedBrecha(r.opportunityId, enriched);
      r.body = enriched.recommendedMove.rationale.slice(0, 2).join(" · ");
    }
  }

  return ok(recs);
}
