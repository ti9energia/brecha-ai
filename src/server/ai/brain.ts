// ─────────────────────────────────────────────────────────────────────────────
// Cérebro de domínio (fallback determinístico do AI Core). Sem chamada externa:
// consulta os DADOS REAIS do tenant e responde com números corretos + ações.
// É o que roda quando não há ANTHROPIC_API_KEY — instantâneo e útil.
// ─────────────────────────────────────────────────────────────────────────────
import { copilotContext, listOpportunities, opportunitiesSummary, daysUntil } from "../domain/store";
import { localeMeta, type Locale } from "@/i18n/config";

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

const PT = (l: Locale) => l === "pt-BR";

export function domainBrain(message: string, locale: Locale): CopilotReply {
  const m = message.toLowerCase();
  const ctx = copilotContext();
  const summary = opportunitiesSummary();
  const top = listOpportunities({ sort: "gain" });
  const urgent = listOpportunities({ sort: "deadline" }).filter((o) => daysUntil(o.windowEnd) <= 21);
  const pt = PT(locale);

  const has = (...kw: string[]) => kw.some((k) => m.includes(k));

  // ── economia capturada / success fee ──
  if (has("economi", "captur", "saving", "fee", "quanto")) {
    const s = ctx.savings;
    const text = pt
      ? `Até agora você capturou **${money(s.realizedYtd, locale)}** em economia realizada no ano. Há **${money(s.inExecution, locale)}** ainda em execução e o projetado para 12 meses é **${money(s.projected12m, locale)}**. O success fee sobre a base conciliada é de **${money(s.feeDue, locale, false)}** (${(s.feeRate * 100).toFixed(0)}%).`
      : `So far you've captured **${money(s.realizedYtd, locale)}** in realized savings this year, with **${money(s.inExecution, locale)}** still in execution and **${money(s.projected12m, locale)}** projected over 12 months. The success fee on the reconciled base is **${money(s.feeDue, locale, false)}** (${(s.feeRate * 100).toFixed(0)}%).`;
    return { text, sources: [{ ref: "SavingsRecord · conciliação" }], actions: [{ label: pt ? "Abrir economia capturada" : "Open captured savings", module: "savings" }], model: "Cérebro local" };
  }

  // ── janelas fechando / urgência ──
  if (has("fech", "urgent", "prazo", "closing", "expir")) {
    const u = urgent[0];
    if (!u) {
      const text = pt
        ? `Nenhuma janela fechando nos próximos 21 dias. Você tem **${summary.openWindows}** janela(s) aberta(s) com mais folga — quer ver as de maior ganho?`
        : `No windows closing within the next 21 days. You have **${summary.openWindows}** open window(s) with more runway — want to see the highest-gain ones?`;
      return { text, sources: [], actions: [{ label: pt ? "Ver oportunidades" : "View opportunities", module: "opportunities" }], model: "Cérebro local" };
    }
    const text = pt
      ? `Há **${urgent.length}** janela(s) fechando em até 21 dias. A mais urgente é **${u.title}** — fecha em **${u.daysRemaining} dias**, com ganho estimado de **${money(u.estimatedGain, locale)}/ano**. Disparada por ${u.norm.source.ref}.`
      : `There are **${urgent.length}** window(s) closing within 21 days. The most urgent is **${u.title}** — closes in **${u.daysRemaining} days**, estimated gain **${money(u.estimatedGain, locale)}/yr**. Triggered by ${u.norm.source.ref}.`;
    return { text, sources: [{ ref: u.norm.source.ref, url: u.norm.source.url }], actions: [{ label: pt ? "Ver a jogada" : "View the play", module: "opportunity", params: { id: u.id } }, { label: pt ? "Ver todas" : "View all", module: "opportunities" }], model: "Cérebro local" };
  }

  // ── maior ganho / melhor jogada ──
  if (has("maior", "melhor", "biggest", "best", "ganho", "jogada", "play")) {
    const o = top[0];
    if (!o) {
      const text = pt
        ? `No momento não há nenhuma janela aberta. O radar segue varrendo os diários oficiais — você é avisado assim que uma brecha abrir.`
        : `There are no open windows right now. The radar keeps sweeping the official gazettes — you'll be alerted the moment one opens.`;
      return { text, sources: [], actions: [{ label: pt ? "Ver radar normativo" : "View regulatory radar", module: "radar" }], model: "Cérebro local" };
    }
    const text = pt
      ? `A jogada de maior ganho aberta é **${o.title}**, com **${money(o.estimatedGain, locale)}/ano**. Recomendação: ${o.recommendedMove.headline}. Confiança de ${(o.confidence * 100).toFixed(0)}% sobre ${o.correlatedNorms} normas correlatas.`
      : `The highest-gain open play is **${o.title}**, at **${money(o.estimatedGain, locale)}/yr**. Recommendation: ${o.recommendedMove.headline}. Confidence ${(o.confidence * 100).toFixed(0)}% across ${o.correlatedNorms} correlated norms.`;
    return { text, sources: [{ ref: o.norm.source.ref, url: o.norm.source.url }], actions: [{ label: pt ? "Abrir detalhe" : "Open detail", module: "opportunity", params: { id: o.id } }, { label: pt ? "Simular variações" : "Simulate variations", module: "simulator", params: { from: o.id } }], model: "Cérebro local" };
  }

  // ── simular ──
  if (has("simul", "cenário", "scenario", "regime", "lucro real", "presumido")) {
    const text = pt
      ? `Posso simular a reorganização no motor fiscal. Abra o simulador e ajuste regime, jurisdição e enquadramento — o cálculo do antes/depois é determinístico. Quer que eu já abra com o cenário SUDENE (maior economia projetada)?`
      : `I can simulate the restructuring in the fiscal engine. Open the simulator and adjust regime, jurisdiction and classification — the before/after is deterministic. Want me to open it with the SUDENE scenario (largest projected saving)?`;
    return { text, sources: [], actions: [{ label: pt ? "Abrir simulador" : "Open simulator", module: "simulator" }], model: "Cérebro local" };
  }

  // ── estrutura ──
  if (has("estrutura", "structure", "regime atual", "cnpj", "perfil")) {
    const st = ctx.structure;
    const text = pt
      ? `A ${st.legalName} está no **${st.regime}**, com sede em ${st.headquarters}, faturamento de **${money(st.annualRevenue, locale)}/ano** e atuação em ${st.jurisdictions.join(", ")}. O perfil está ${(st.completeness * 100).toFixed(0)}% completo — quanto mais completo, mais precisa a simulação.`
      : `${st.legalName} is on **${st.regime}**, HQ in ${st.headquarters}, revenue **${money(st.annualRevenue, locale)}/yr**, operating across ${st.jurisdictions.join(", ")}. The profile is ${(st.completeness * 100).toFixed(0)}% complete — the more complete, the sharper the simulation.`;
    return { text, sources: [], actions: [{ label: pt ? "Abrir minha estrutura" : "Open my structure", module: "structure" }], model: "Cérebro local" };
  }

  // ── oportunidades abertas (e fallback de "lista") ──
  if (has("oportunidad", "abert", "opportunit", "open", "janela", "window", "lista", "quais", "what")) {
    const list = top.slice(0, 3).map((o, i) => `${i + 1}. **${o.title}** — ${money(o.estimatedGain, locale)}/ano · fecha em ${o.daysRemaining}d`).join("\n");
    const text = pt
      ? `Você tem **${summary.openWindows}** janelas abertas, somando **${money(summary.openGain, locale)}** em ganho potencial. As maiores:\n\n${list}`
      : `You have **${summary.openWindows}** open windows totaling **${money(summary.openGain, locale)}** in potential gain. The largest:\n\n${list}`;
    return { text, sources: top.slice(0, 3).map((o) => ({ ref: o.norm.source.ref, url: o.norm.source.url })), actions: [{ label: pt ? "Abrir oportunidades" : "Open opportunities", module: "opportunities" }], model: "Cérebro local" };
  }

  // ── saudação / ajuda / fallback ──
  const text = pt
    ? `Sou a Vega, seu copiloto regulatório. Conheço cada janela aberta para a ${ctx.structure.legalName}, sei simular a jogada e calcular a economia. Você tem **${summary.openWindows}** oportunidades abertas (${money(summary.openGain, locale)}). Pergunte, por exemplo: "qual a jogada de maior ganho?" ou "quais janelas estão fechando?".`
    : `I'm Vega, your regulatory copilot. I know every open window for ${ctx.structure.legalName}, can simulate the play and compute the savings. You have **${summary.openWindows}** open opportunities (${money(summary.openGain, locale)}). Try: "what's the highest-gain play?" or "which windows are closing?".`;
  return {
    text,
    sources: [],
    actions: [
      { label: pt ? "Oportunidades" : "Opportunities", module: "opportunities" },
      { label: pt ? "Economia" : "Savings", module: "savings" },
    ],
    model: "Cérebro local",
  };
}
