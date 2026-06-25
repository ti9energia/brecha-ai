// ─────────────────────────────────────────────────────────────────────────────
// AI Core · Camada de Modelo (0A §2.1). O produto NUNCA chama o modelo direto —
// fala só com o AI Core, que roteia para um LLMProvider. Trocar o Claude por um
// modelo próprio/finetunado num servidor seu é IMPLEMENTAR esta interface e
// registrá-la no resolveProvider — sem tocar no resto do produto.
// ─────────────────────────────────────────────────────────────────────────────
import { askClaude } from "@/server/ai/claude";
import type { Locale } from "@/i18n/config";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}
export interface LLMResult {
  text: string;
  model: string;
}

export interface LLMProvider {
  readonly id: string;
  /** Disponível agora? (ex.: tem chave / servidor de inferência up). */
  available(): boolean;
  /** Refina/gera o texto. `null` → o AI Core usa o texto determinístico do domínio. */
  refine(messages: LLMMessage[], locale: Locale): Promise<LLMResult | null>;
}

// Provider 1 — Anthropic Claude (atual). Encapsula o fetch da Messages API.
export const anthropicProvider: LLMProvider = {
  id: "anthropic",
  available: () => !!process.env.ANTHROPIC_API_KEY,
  async refine(messages, locale) {
    const r = await askClaude(messages, locale);
    return r ? { text: r.text, model: r.model } : null;
  },
};

// Provider 2 — cérebro local determinístico (sem modelo externo). Sempre
// disponível; não "refina" (retorna null) → o AI Core usa o texto do domínio.
export const localProvider: LLMProvider = {
  id: "local",
  available: () => true,
  async refine() {
    return null;
  },
};

// SWAP (produção): para um modelo próprio/finetunado, implemente um
// `selfHostedProvider` com `refine()` chamando seu servidor de inferência e
// devolva-o aqui. O roteamento por tarefa/custo/fallback (0A §2.1) entra neste
// ponto (ex.: modelo rápido p/ classificação, forte p/ síntese).
export function resolveProvider(): LLMProvider {
  if (anthropicProvider.available()) return anthropicProvider;
  return localProvider;
}
