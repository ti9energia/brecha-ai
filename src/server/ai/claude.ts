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
    openOpportunities: ctx.opportunities.map((o) => ({
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
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        system: systemPrompt(locale),
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
