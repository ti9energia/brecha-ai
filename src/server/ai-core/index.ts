// ─────────────────────────────────────────────────────────────────────────────
// AI Core — fachada (0A §2.9). Ponto ÚNICO por onde o produto fala com a IA.
// Combina duas camadas:
//   • TOOLS/DOMÍNIO  → ações + fontes determinísticas a partir dos dados reais.
//   • MODELO         → texto refinado por um LLMProvider trocável (Claude/próprio).
// Copiloto (UI), Agente Autônomo e WhatsApp são apenas CLIENTES desta fachada.
//
// SWAP (produção): este módulo é o que vira `apps/ai-core` (serviço separado).
// O contrato (aiChat + as interfaces de provider/tools/connectors/knowledge) já
// existe; extrair = mover a pasta e expor por HTTP, sem reescrever o produto.
// ─────────────────────────────────────────────────────────────────────────────
import { domainBrain, type CopilotReply } from "@/server/ai/brain";
import { resolveProvider, type LLMMessage, type LLMProvider } from "./provider";
import type { Locale } from "@/i18n/config";

export type { LLMMessage, LLMProvider } from "./provider";
export { resolveProvider, anthropicProvider, localProvider } from "./provider";
export { listTools, invokeTool, TOOLS, type Tool, type ToolResult } from "./tools";

export async function aiChat(
  messages: LLMMessage[],
  locale: Locale,
  provider: LLMProvider = resolveProvider(),
): Promise<CopilotReply> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  // Camada de tools/domínio: grounding determinístico (ações + fontes reais).
  const grounding = domainBrain(lastUser, locale);
  // Camada de modelo: refina o texto (ou null → usa o texto determinístico).
  const refined = await provider.refine(messages, locale);
  return {
    text: refined?.text ?? grounding.text,
    model: refined?.model ?? grounding.model,
    sources: grounding.sources,
    actions: grounding.actions,
  };
}
