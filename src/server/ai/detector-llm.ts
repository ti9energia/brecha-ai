// ─────────────────────────────────────────────────────────────────────────────
// Camada de MODELO do detector (0A §2.1). O determinístico (detector.ts) continua
// sendo o padrão; quando há ANTHROPIC_API_KEY, o Claude REFINA a brecha: devolve a
// jogada em JSON estruturado (headline, rationale, requisitos, confiança, tipo), que
// é VALIDADO e sobreposto à oportunidade determinística — MANTENDO os números da
// simulação (o modelo não inventa valores) e a norma-gatilho. Sem chave / erro / JSON
// inválido → fica a versão determinística. Mesmo padrão brain↔claude.
//
// Puro e testável: a chamada de rede entra por INJEÇÃO (`ask`), default no Claude. Os
// testes passam um `ask` falso e cobrem parse/validação/aplicação/fallback sem rede.
// ─────────────────────────────────────────────────────────────────────────────
import { askClaudeText } from "./claude";
import { localeMeta, type Locale } from "@/i18n/config";
import type { Norm, Opportunity, ClientStructure, OpportunityType } from "@/server/domain/types";

export interface BrechaDraft {
  headline?: string;
  rationale?: string[];
  requirements?: string[];
  confidence?: number; // 0..1
  type?: OpportunityType;
}

const TYPES: OpportunityType[] = ["regime", "incentive", "jurisdiction", "classification", "credit"];

/** Extrai e valida um BrechaDraft do texto do modelo (tolera prosa em volta do JSON). */
export function parseBrechaDraft(text: string): BrechaDraft | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const draft: BrechaDraft = {};

  if (typeof o.headline === "string" && o.headline.trim()) draft.headline = o.headline.trim().slice(0, 200);

  if (Array.isArray(o.rationale)) {
    const r = o.rationale.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 300)).slice(0, 6);
    if (r.length) draft.rationale = r;
  }
  if (Array.isArray(o.requirements)) {
    const r = o.requirements.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 200)).slice(0, 6);
    if (r.length) draft.requirements = r;
  }
  if (typeof o.confidence === "number" && o.confidence >= 0 && o.confidence <= 1) draft.confidence = o.confidence;
  if (typeof o.type === "string" && TYPES.includes(o.type as OpportunityType)) draft.type = o.type as OpportunityType;

  return Object.keys(draft).length ? draft : null; // sem campo útil → não é um draft
}

/**
 * Sobrepõe o draft do modelo na oportunidade determinística — preservando os números
 * da simulação, o ganho e a norma-gatilho (o modelo refina a LINGUAGEM, não os valores).
 */
export function applyBrechaDraft(opp: Opportunity, draft: BrechaDraft): Opportunity {
  return {
    ...opp,
    type: draft.type ?? opp.type,
    confidence: draft.confidence ?? opp.confidence,
    recommendedMove: {
      ...opp.recommendedMove,
      headline: draft.headline ?? opp.recommendedMove.headline,
      rationale: draft.rationale ?? opp.recommendedMove.rationale,
      requirements: draft.requirements ?? opp.recommendedMove.requirements,
    },
  };
}

/** Prompt: dá ao modelo o perfil DA EMPRESA + a norma e pede a jogada em JSON. */
export function buildBrechaPrompt(n: Norm, st: ClientStructure, locale: Locale): string {
  const lang = localeMeta[locale].native;
  return [
    "Você é um tributarista sênior. Avalie se a norma abre uma brecha (oportunidade) para ESTA empresa e descreva a jogada ótima.",
    `Empresa: ${st.legalName}; regime ${st.regime}; sede ${st.headquarters}; jurisdições ${st.jurisdictions.join(", ")}.`,
    `O que a empresa é (descrição do cliente): ${st.businessProfile || "(não informado)"}`,
    `Norma: ${n.title} — ${n.summary} (${n.source.ref}, ${n.jurisdiction}).`,
    `Responda SOMENTE com um JSON válido no idioma ${lang}, sem nenhum texto fora do JSON, no formato:`,
    `{"headline": string, "rationale": [string], "requirements": [string], "confidence": number entre 0 e 1, "type": "regime"|"incentive"|"jurisdiction"|"classification"|"credit"}`,
    "Em `rationale`, explique POR QUE casa com o negócio descrito. NÃO invente valores monetários (os números vêm da simulação).",
  ].join("\n");
}

export type AskFn = (prompt: string) => Promise<string | null>;

/**
 * Refina UMA brecha pelo modelo: monta o prompt, chama `ask` (default Claude), valida e
 * aplica. Qualquer falha (sem chave, erro, JSON inválido) → devolve a brecha determinística.
 */
export async function enrichBrecha(
  opp: Opportunity,
  n: Norm,
  st: ClientStructure,
  locale: Locale,
  ask: AskFn = askClaudeText,
): Promise<Opportunity> {
  const text = await ask(buildBrechaPrompt(n, st, locale));
  const draft = text ? parseBrechaDraft(text) : null;
  return draft ? applyBrechaDraft(opp, draft) : opp;
}
