// ─────────────────────────────────────────────────────────────────────────────
// AI Core · Agente Autônomo (0A §4). MONITORA o sistema (dados ao vivo) e PROPÕE
// decisões dentro de guardrails. Modo "sugestivo": gera uma fila de recomendações
// com justificativa, impacto e confiança. Cada run é auditado (0A §2.8).
//
// 4 IDIOMAS (00-PADRÃO §6): os textos das recomendações vêm do catálogo i18n
// (namespace `agent`) no locale do usuário — moeda/percentual formatados por locale.
// Conteúdo de domínio (título da brecha, ref da norma) é preservado no original (§8).
//
// SWAP (produção): rodar como job agendado (modo "agendado") sobre eventos do
// barramento; modo "semiautônomo" executa o que está na alçada via tools.
// ─────────────────────────────────────────────────────────────────────────────
import { listOpportunities, getStructure, getSavings, recordAiAction, openDetectedOpportunities } from "@/server/domain/store";
import type { AgentRecommendation } from "@/server/domain/types";
import { getT, getFmt } from "@/i18n/server";
import type { Locale } from "@/i18n/config";

export function agentRun(now = new Date(), locale: Locale = "pt-BR"): AgentRecommendation[] {
  const at = now.toISOString();
  const recs: AgentRecommendation[] = [];
  const t = getT(locale, "agent");
  const fmt = getFmt(locale);

  // 1) Janelas fechando em ≤ 14 dias → alerta de urgência.
  const closing = listOpportunities({ sort: "deadline" }).filter((o) => o.daysRemaining >= 0 && o.daysRemaining <= 14);
  for (const o of closing.slice(0, 3)) {
    recs.push({
      id: `agent-window-${o.id}`,
      kind: "window_closing",
      title: t("recWindowTitle", { title: o.title }),
      body: t("recWindowBody", { days: String(o.daysRemaining), ref: o.norm.source.ref }),
      impact: o.estimatedGain,
      confidence: o.confidence,
      opportunityId: o.id,
      createdAt: at,
    });
  }

  // 2) NOVAS BRECHAS (o núcleo): cruza o perfil do cliente — inclusive o texto livre
  //    `businessProfile` (a explicação do usuário do que é a empresa) — com as normas
  //    do radar e ABRE as oportunidades relevantes ainda não exploradas (08 §6/§12).
  //    A justificativa (body) cita POR QUE casa com esta empresa (sinais do cruzamento).
  const detected = openDetectedOpportunities();
  for (const o of detected.slice(0, 3)) {
    recs.push({
      id: `agent-new-${o.id}`,
      kind: "new_opportunity",
      title: t("recNewTitle", { title: o.title }),
      body: o.recommendedMove.rationale.slice(0, 2).join(" · "),
      impact: o.estimatedGain,
      confidence: o.confidence,
      opportunityId: o.id,
      createdAt: at,
    });
  }

  // 3) CONCILIAÇÃO: economia capturada ainda não conciliada não entra na base do
  //    success fee. O agente cobra a conciliação (08 §7 — conciliação da economia).
  const unreconciled = getSavings().records.filter((r) => !r.reconciled);
  if (unreconciled.length) {
    const amount = unreconciled.reduce((s, r) => s + r.realizedGain, 0);
    recs.push({
      id: "agent-reconcile",
      kind: "reconcile",
      title: t("recReconcileTitle", { amount: fmt.moneyCompact(amount) }),
      body: t("recReconcileBody", { count: String(unreconciled.length) }),
      impact: amount,
      confidence: 0.93,
      opportunityId: unreconciled[0].opportunityId,
      createdAt: at,
    });
  }

  // 4) Lacuna de estrutura → perfil incompleto reduz a precisão da simulação.
  const st = getStructure();
  if (st.completeness < 0.85) {
    recs.push({
      id: "agent-structure-gap",
      kind: "structure_gap",
      title: t("recGapTitle"),
      body: t("recGapBody", { pct: String(Math.round(st.completeness * 100)) }),
      impact: 0,
      confidence: 0.9,
      createdAt: at,
    });
  }

  recordAiAction({ actor: "Vega (Agente)", action: "Agente executado", detail: `${recs.length} recomendação(ões)` });
  return recs;
}
