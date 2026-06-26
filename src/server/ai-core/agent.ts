// ─────────────────────────────────────────────────────────────────────────────
// AI Core · Agente Autônomo (0A §4). MONITORA o sistema (dados ao vivo) e PROPÕE
// decisões dentro de guardrails. Modo "sugestivo": gera uma fila de recomendações
// com justificativa, impacto e confiança. Cada run é auditado (0A §2.8).
//
// SWAP (produção): rodar como job agendado (modo "agendado") sobre eventos do
// barramento; modo "semiautônomo" executa o que está na alçada via tools.
// ─────────────────────────────────────────────────────────────────────────────
import { listOpportunities, getStructure, recordAiAction, openDetectedOpportunities } from "@/server/domain/store";
import type { AgentRecommendation } from "@/server/domain/types";

export function agentRun(now = new Date()): AgentRecommendation[] {
  const at = now.toISOString();
  const recs: AgentRecommendation[] = [];

  // 1) Janelas fechando em ≤ 14 dias → alerta de urgência.
  const closing = listOpportunities({ sort: "deadline" }).filter((o) => o.daysRemaining >= 0 && o.daysRemaining <= 14);
  for (const o of closing.slice(0, 3)) {
    recs.push({
      id: `agent-window-${o.id}`,
      kind: "window_closing",
      title: `Janela fechando: ${o.title}`,
      body: `Fecha em ${o.daysRemaining} dia(s). Ganho estimado em risco — disparada por ${o.norm.source.ref}.`,
      impact: o.estimatedGain,
      confidence: o.confidence,
      opportunityId: o.id,
      createdAt: at,
    });
  }

  // 2) NOVAS BRECHAS (o núcleo): cruza o perfil do cliente — inclusive o texto livre
  //    `businessProfile` (a explicação do usuário do que é a empresa) — com as normas
  //    do radar e ABRE as oportunidades relevantes ainda não exploradas (08 §6/§12).
  //    A justificativa cita POR QUE casa com esta empresa (os sinais do cruzamento).
  const detected = openDetectedOpportunities();
  for (const o of detected.slice(0, 3)) {
    recs.push({
      id: `agent-new-${o.id}`,
      kind: "new_opportunity",
      title: `Nova brecha: ${o.title}`,
      body: o.recommendedMove.rationale.slice(0, 2).join(" · "),
      impact: o.estimatedGain,
      confidence: o.confidence,
      opportunityId: o.id,
      createdAt: at,
    });
  }

  // 3) Lacuna de estrutura → perfil incompleto reduz a precisão da simulação.
  const st = getStructure();
  if (st.completeness < 0.85) {
    recs.push({
      id: "agent-structure-gap",
      kind: "structure_gap",
      title: "Perfil incompleto reduz a precisão",
      body: `Estrutura ${Math.round(st.completeness * 100)}% completa. Complete o perfil para simulações mais precisas.`,
      impact: 0,
      confidence: 0.9,
      createdAt: at,
    });
  }

  recordAiAction({ actor: "Vega (Agente)", action: "Agente executado", detail: `${recs.length} recomendação(ões)` });
  return recs;
}
