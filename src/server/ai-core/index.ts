// ─────────────────────────────────────────────────────────────────────────────
// AI Core — fachada (0A §2.9). Ponto ÚNICO por onde o produto fala com a IA.
// Combina três camadas:
//   • TOOLS/DOMÍNIO  → ações + fontes determinísticas a partir dos dados reais.
//   • KNOWLEDGE/RAG  → fontes adicionais recuperadas por relevância (por tenant).
//   • MODELO         → texto refinado por um LLMProvider trocável (Claude/próprio).
// Copiloto (UI), Agente Autônomo e WhatsApp são apenas CLIENTES desta fachada.
//
// SWAP (produção): este módulo é o que vira `apps/ai-core` (serviço separado).
// O contrato (aiChat + as interfaces de provider/tools/connectors/knowledge) já
// existe; extrair = mover a pasta e expor por HTTP, sem reescrever o produto.
// ─────────────────────────────────────────────────────────────────────────────
import { domainBrain, type CopilotReply, type CopilotSource } from "@/server/ai/brain";
import { resolveProvider, type LLMMessage, type LLMProvider } from "./provider";
import { inMemoryKnowledge } from "./knowledge";
import { remember } from "./memory";
import type { Locale } from "@/i18n/config";

export type { LLMMessage, LLMProvider } from "./provider";
export { resolveProvider, anthropicProvider, localProvider } from "./provider";
export { listTools, invokeTool, TOOLS, type Tool, type ToolResult } from "./tools";
export { inMemoryKnowledge, ingestDocument, ingestedCount, type KnowledgeStore, type Retrieved } from "./knowledge";
export { getKnowledgeStore, __resetKnowledgeStore } from "./knowledgePgvector";
export { remember, recall, memorySize, type MemoryTurn } from "./memory";
export { listConnectors, getConnector, type Connector } from "./connectors";
export { trainingSnapshot, trainingPipeline, type TrainingSnapshot, type TrainingPipeline } from "./training";
export { runScheduledJobs, type JobsResult } from "./jobs";
export { agentRun } from "./agent";

function dedupeSources(sources: CopilotSource[]): CopilotSource[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    if (seen.has(s.ref)) return false;
    seen.add(s.ref);
    return true;
  });
}

export async function aiChat(
  messages: LLMMessage[],
  locale: Locale,
  provider: LLMProvider = resolveProvider(),
  orgId = "org-acme",
  userId?: string,
): Promise<CopilotReply> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  // Camada de tools/domínio: grounding determinístico (ações + fontes reais).
  const grounding = domainBrain(lastUser, locale);
  // Camada de RAG: enriquece as fontes com chunks relevantes (isolado por tenant).
  // Usa getKnowledgeStore() → pgvector se DATABASE_URL, in-memory caso contrário.
  const retrieved = (await inMemoryKnowledge.retrieve(lastUser, orgId, 3))
    .filter((r) => r.ref)
    .map((r) => ({ ref: r.ref as string }));
  const sources = dedupeSources([...grounding.sources, ...retrieved]);
  // Camada de modelo: refina o texto (ou null → usa o texto determinístico). O
  // cliente já envia o thread visível completo em `messages` (rota /ai/chat, últimas
  // N), que é a FONTE DA VERDADE do turno — então NÃO prependemos `recall()` aqui:
  // isso duplicaria os mesmos turnos (e poderia gerar sequência user/user que a
  // Anthropic rejeita, derrubando o caminho do modelo). A memória por usuário (0A
  // §2.3) é gravada abaixo via remember() para continuidade/captura de treino.
  const refined = await provider.refine(messages, locale, orgId);

  const reply: CopilotReply = {
    text: refined?.text ?? grounding.text,
    model: refined?.model ?? grounding.model,
    sources,
    actions: grounding.actions,
  };
  if (userId) {
    await remember(userId, { role: "user", content: lastUser });
    await remember(userId, { role: "assistant", content: reply.text });
  }
  return reply;
}
