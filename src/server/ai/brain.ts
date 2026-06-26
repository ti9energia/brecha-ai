// ─────────────────────────────────────────────────────────────────────────────
// Cérebro de domínio (fallback determinístico do AI Core). Sem chamada externa:
// consulta os DADOS REAIS do tenant e responde com números corretos + ações.
// É o que roda quando não há ANTHROPIC_API_KEY — instantâneo e útil.
//
// 4 IDIOMAS (00-PADRÃO §6.7e / 0A DoD b / 0B DoD f): as respostas vêm do catálogo
// i18n (namespace `brain`) no locale do usuário; a detecção de intenção usa palavras-
// chave nos 4 idiomas (pt/en/zh/fr).
// ─────────────────────────────────────────────────────────────────────────────
import { copilotContext, listOpportunities, opportunitiesSummary, daysUntil } from "../domain/store";
import { localeMeta, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";

export interface CopilotAction {
  label: string;
  module: string;
  params?: Record<string, string>;
}
export interface CopilotSource {
  ref: string;
  url?: string;
}
export interface CopilotReply {
  text: string;
  sources: CopilotSource[];
  actions: CopilotAction[];
  model: string;
}

function money(value: number, locale: Locale, compact = true) {
  return new Intl.NumberFormat(localeMeta[locale].intl, {
    style: "currency",
    currency: "BRL",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

// Palavras-chave por intenção, nos 4 idiomas (match em substring lowercase). Assim
// um usuário em zh/fr é entendido — não só pt/en.
const KW = {
  savings: ["economi", "captur", "saving", "fee", "quanto", "经济", "节省", "已实现", "费用", "多少", "économ", "capté", "réalisé", "combien", "frais"],
  closing: ["fech", "urgent", "prazo", "closing", "expir", "关闭", "紧急", "截止", "即将", "ferme", "échéance", "expire", "délai"],
  biggest: ["maior", "melhor", "biggest", "best", "ganho", "jogada", "play", "最大", "最佳", "收益", "方案", "plus grand", "meilleur", "gain", "coup"],
  simulate: ["simul", "cenário", "scenario", "regime", "lucro real", "presumido", "模拟", "情景", "税制", "scénario", "régime"],
  structure: ["estrutura", "structure", "regime atual", "cnpj", "perfil", "结构", "架构", "档案", "profil"],
  list: ["oportunidad", "abert", "opportunit", "open", "janela", "window", "lista", "quais", "what", "机会", "窗口", "列表", "哪些", "fenêtre", "ouvert", "liste", "quel"],
};
const matches = (m: string, kws: string[]) => kws.some((k) => m.includes(k));

export function domainBrain(message: string, locale: Locale): CopilotReply {
  const m = message.toLowerCase();
  const ctx = copilotContext();
  const summary = opportunitiesSummary();
  const top = listOpportunities({ sort: "gain" });
  const urgent = listOpportunities({ sort: "deadline" }).filter((o) => {
    const d = daysUntil(o.windowEnd);
    return d >= 0 && d <= 21; // janela ainda aberta e fechando em ≤ 21 dias
  });
  const t = getT(locale, "brain");
  const pct = (v: number) => (v * 100).toFixed(0);
  const model = "Cérebro local";

  // ── economia capturada / success fee ──
  if (matches(m, KW.savings)) {
    const s = ctx.savings;
    return {
      text: t("savings", {
        realized: money(s.realizedYtd, locale), inExec: money(s.inExecution, locale),
        projected: money(s.projected12m, locale), feeDue: money(s.feeDue, locale, false), feeRate: pct(s.feeRate),
      }),
      sources: [{ ref: "SavingsRecord · conciliação" }],
      actions: [{ label: t("savingsAction"), module: "savings" }],
      model,
    };
  }

  // ── janelas fechando / urgência ──
  if (matches(m, KW.closing)) {
    const u = urgent[0];
    if (!u) {
      return { text: t("closingNone", { open: String(summary.openWindows) }), sources: [], actions: [{ label: t("closingNoneAction"), module: "opportunities" }], model };
    }
    return {
      text: t("closingSome", { count: String(urgent.length), title: u.title, days: String(u.daysRemaining), gain: money(u.estimatedGain, locale), source: u.norm.source.ref }),
      sources: [{ ref: u.norm.source.ref, url: u.norm.source.url }],
      actions: [{ label: t("viewPlay"), module: "opportunity", params: { id: u.id } }, { label: t("viewAll"), module: "opportunities" }],
      model,
    };
  }

  // ── maior ganho / melhor jogada ──
  if (matches(m, KW.biggest)) {
    const o = top[0];
    if (!o) {
      return { text: t("biggestNone"), sources: [], actions: [{ label: t("viewRadar"), module: "radar" }], model };
    }
    return {
      text: t("biggestSome", { title: o.title, gain: money(o.estimatedGain, locale), headline: o.recommendedMove.headline, confidence: pct(o.confidence), norms: String(o.correlatedNorms) }),
      sources: [{ ref: o.norm.source.ref, url: o.norm.source.url }],
      actions: [{ label: t("openDetail"), module: "opportunity", params: { id: o.id } }, { label: t("simulateVariations"), module: "simulator", params: { from: o.id } }],
      model,
    };
  }

  // ── simular ──
  if (matches(m, KW.simulate)) {
    return { text: t("simulate"), sources: [], actions: [{ label: t("openSimulator"), module: "simulator" }], model };
  }

  // ── estrutura ──
  if (matches(m, KW.structure)) {
    const st = ctx.structure;
    return {
      text: t("structure", { legalName: st.legalName, regime: st.regime, hq: st.headquarters, revenue: money(st.annualRevenue, locale), jurisdictions: st.jurisdictions.join(", "), completeness: pct(st.completeness) }),
      sources: [],
      actions: [{ label: t("openStructure"), module: "structure" }],
      model,
    };
  }

  // ── oportunidades abertas (e fallback de "lista") ──
  if (matches(m, KW.list)) {
    const list = top.slice(0, 3).map((o, i) => t("listItem", { n: String(i + 1), title: o.title, gain: money(o.estimatedGain, locale), days: String(o.daysRemaining) })).join("\n");
    return {
      text: `${t("listIntro", { open: String(summary.openWindows), gain: money(summary.openGain, locale) })}\n\n${list}`,
      sources: top.slice(0, 3).map((o) => ({ ref: o.norm.source.ref, url: o.norm.source.url })),
      actions: [{ label: t("openOpportunities"), module: "opportunities" }],
      model,
    };
  }

  // ── saudação / ajuda / fallback ──
  return {
    text: t("greeting", { legalName: ctx.structure.legalName, open: String(summary.openWindows), gain: money(summary.openGain, locale) }),
    sources: [],
    actions: [
      { label: t("opportunities"), module: "opportunities" },
      { label: t("savingsShort"), module: "savings" },
    ],
    model,
  };
}
