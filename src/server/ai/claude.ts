// ─────────────────────────────────────────────────────────────────────────────
// Provider Claude (Anthropic Messages API). Liga o AI Core ao modelo real quando
// há ANTHROPIC_API_KEY. Sem SDK — fetch direto. Retorna null em erro/sem-chave,
// e a rota cai no cérebro de domínio (brain.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { copilotContext } from "../domain/store";
import { localeMeta, type Locale } from "@/i18n/config";
import type { CopilotReply } from "./brain";

const ENDPOINT = "https://api.anthropic.com/v1/messages";

function systemPrompt(locale: Locale): string {
  const ctx = copilotContext();
  const lang = localeMeta[locale].native;
  const compact = {
    organization: ctx.structure.legalName,
    regime: ctx.structure.regime,
    headquarters: ctx.structure.headquarters,
    annualRevenue: ctx.structure.annualRevenue,
    jurisdictions: ctx.structure.jurisdictions,
    // A "explicação do usuário do que é a empresa" — o que o detector cruza com as
    // normas. Vai no prompt para o copiloto também raciocinar sobre brechas a partir dela.
    businessProfile: ctx.structure.businessProfile,
    // Cap no system prompt: top-12 por ganho (já vêm ordenadas) — o custo do
    // prompt não deve crescer sem limite com o tamanho do dataset do tenant.
    openOpportunities: ctx.opportunities.slice(0, 12).map((o) => ({
      id: o.id,
      title: o.title,
      type: o.type,
      estimatedGainBRL: o.estimatedGain,
      daysRemaining: o.daysRemaining,
      confidence: o.confidence,
      status: o.status,
      recommendedMove: o.recommendedMove.headline,
      triggerNorm: o.norm.source.ref,
    })),
    savings: {
      realizedYtdBRL: ctx.savings.realizedYtd,
      projected12mBRL: ctx.savings.projected12m,
      feeRate: ctx.savings.feeRate,
      feeDueBRL: ctx.savings.feeDue,
    },
  };

  return [
    "Você é a Vega, copiloto regulatório da plataforma Brecha.ai (um GPS de oportunidade regulatória).",
    "Você entende a estrutura fiscal/jurídica do cliente, conhece cada janela regulatória aberta, sabe explicar a jogada recomendada e calcular a economia.",
    "Use o `businessProfile` (a descrição do que a empresa faz) para raciocinar sobre quais janelas abrem brechas para ESTE cliente e por quê — conectando o que ele descreveu (setores, exportação, projetos) às normas do contexto.",
    `Responda SEMPRE no idioma do usuário: ${lang}. Seja concisa, precisa e orientada à ação. Use valores em R$ (BRL) e cite a norma-fonte quando relevante.`,
    "Nunca invente números: use apenas os dados do contexto abaixo. Ações irreversíveis exigem aprovação humana do tributarista — apenas recomende, não afirme que executou.",
    "Contexto do tenant (JSON):",
    JSON.stringify(compact),
  ].join("\n");
}

export async function askClaude(
  conversation: { role: "user" | "assistant"; content: string }[],
  locale: Locale,
): Promise<CopilotReply | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const model = process.env.AI_CORE_MODEL || "claude-opus-4-8";

  try {
    // Prompt caching (Onda 3): cache_control no system prompt reduz custo e latência
    // para chamadas frequentes ao copiloto (até 90% de economia em cache hit).
    // O contexto do tenant muda pouco entre turnos consecutivos → cache warm.
    const sysContent = systemPrompt(locale);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        system: [
          {
            type: "text",
            text: sysContent,
            cache_control: { type: "ephemeral" }, // // SWAP: "persistent" com ANTHROPIC_CACHE_TTL
          },
        ],
        messages: conversation.map((c) => ({ role: c.role, content: c.content })),
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (json.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n")
      .trim();
    if (!text) return null;
    return { text, sources: [], actions: [], model: `Claude · ${model}` };
  } catch {
    return null;
  }
}

// Chamada de turno único que devolve o TEXTO BRUTO do modelo — para saídas
// ESTRUTURADAS (ex.: o detector pedindo a jogada da brecha em JSON). Sem system
// prompt do copiloto: o chamador monta o prompt. Null sem chave / erro / vazio.
export async function askClaudeText(prompt: string, maxTokens = 600): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const model = process.env.AI_CORE_MODEL || "claude-opus-4-8";
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (json.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").trim();
    return text || null;
  } catch {
    return null;
  }
}
