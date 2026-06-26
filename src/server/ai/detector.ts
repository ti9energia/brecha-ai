// ─────────────────────────────────────────────────────────────────────────────
// Detector de brechas — o CORAÇÃO do Brecha.ai (spec 08 §6/§12).
//
// "IA que interpreta a norma nova, projeta o efeito na estrutura do cliente e
//  sugere a jogada ótima." Aqui isso é REAL e determinístico: cruza cada norma
// com a ESTRUTURA do cliente — inclusive o texto livre `businessProfile` (a
// explicação do usuário do que é a empresa) — calcula a RELEVÂNCIA (não vem mais
// fixa do seed) e, quando passa do limiar, SINTETIZA a oportunidade (brecha):
// jogada recomendada + simulação de impacto.
//
// Puro: depende só de `types` (sem store) — sem ciclo de import, fácil de testar.
// Determinístico: datas/janelas derivam das datas da própria norma (sem Date.now),
// então o mesmo input dá sempre o mesmo output. É o "cérebro local" do detector,
// no mesmo espírito de ai/brain.ts ↔ ai/claude.ts (o modelo refina a linguagem; a
// detecção estrutural roda sem chave, instantânea e auditável).
// ─────────────────────────────────────────────────────────────────────────────
import type {
  Norm, Opportunity, OpportunityType, ClientStructure, SectorId, Level,
} from "@/server/domain/types";

const DAY = 1000 * 60 * 60 * 24;

// Limiar de abertura: abaixo disto a norma fica só no radar (não vira brecha).
export const DETECT_THRESHOLD = 0.5;

// ── Sinais de setor: keyword → setor. Derivamos os setores da empresa a partir do
// texto que o usuário fornece (atividade principal, CNAEs e o businessProfile).
const SECTOR_KW: Record<SectorId, string[]> = {
  industry: ["indúst", "metalúrg", "metalurg", "aço", "metal", "fabricação", "fabricacao", "manufatur", "siderúr", "insumo"],
  agribusiness: ["agro", "rural", "agríc", "agric", "agropecu", "fazenda", "safra"],
  tech: ["software", "tecnolog", "saas", "cloud", "p&d", "pesquisa e desenvolvimento", "dados", "aplicativo", "plataforma digital"],
  retail: ["varejo", "comércio", "comercio", "loja", "atacad", "e-commerce", "consumidor final"],
  logistics: ["logíst", "logist", "transporte", "carga", "frete", "armazena", "rodoviár", "distribuição"],
  energy: ["energia", "usina", "solar", "eólic", "elétric", "eletric", "geração", "geracao", "petróleo", "petroleo", "gás", "o&g", "autoprodução"],
  health: ["saúde", "saude", "hospital", "medicament", "clínic", "clinic", "farmac"],
  finance: ["financ", "banco", "bancár", "seguro", "investiment", "crédito ao consumidor", "fintech"],
  construction: ["construç", "construc", "obra", "imobiliár", "imobiliar", "engenharia civil", "incorporação"],
};

const SECTOR_LABEL: Record<SectorId, string> = {
  industry: "Indústria", agribusiness: "Agronegócio", tech: "Tecnologia", retail: "Varejo",
  logistics: "Logística", energy: "Energia", health: "Saúde", finance: "Serviços financeiros",
  construction: "Construção",
};

// UF (sigla) ↔ nome do estado, para casar `norm.jurisdiction` ("Santa Catarina")
// com as jurisdições vigiadas da estrutura (["SP","SC","MG"]).
const UF_NAME: Record<string, string> = {
  AC: "acre", AL: "alagoas", AP: "amapá", AM: "amazonas", BA: "bahia", CE: "ceará",
  DF: "distrito federal", ES: "espírito santo", GO: "goiás", MA: "maranhão", MT: "mato grosso",
  MS: "mato grosso do sul", MG: "minas gerais", PA: "pará", PB: "paraíba", PR: "paraná",
  PE: "pernambuco", PI: "piauí", RJ: "rio de janeiro", RN: "rio grande do norte",
  RS: "rio grande do sul", RO: "rondônia", RR: "roraima", SC: "santa catarina",
  SP: "são paulo", SE: "sergipe", TO: "tocantins",
};

function norm(s: string): string {
  return s.toLowerCase();
}

function companyText(st: ClientStructure): string {
  return norm(
    [st.mainActivity, st.businessProfile, st.regime, ...st.activities.map((a) => a.label)].join(" "),
  );
}

/** Setores que a empresa toca, inferidos do texto livre + atividades (não de um campo fixo). */
export function companySectors(st: ClientStructure): Set<SectorId> {
  const hay = companyText(st);
  const out = new Set<SectorId>();
  for (const [sector, kws] of Object.entries(SECTOR_KW) as [SectorId, string[]][]) {
    if (kws.some((k) => hay.includes(k))) out.add(sector);
  }
  return out;
}

// Tokens significativos (≥ 4 letras), sem acento, para medir aderência ao perfil.
const STOP = new Set([
  "para", "com", "dos", "das", "uma", "que", "por", "sobre", "este", "esta", "como",
  "sua", "seu", "são", "sao", "nas", "nos", "ate", "até", "mais", "menos", "pela", "pelo",
]);
function tokens(s: string): Set<string> {
  return new Set(
    norm(s)
      .normalize("NFD").replace(/[̀-ͯ]/g, "") // tira acentos: "logística"≈"logistica"
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
}

export interface Relevance {
  score: number; // 0..1
  reasons: string[]; // por que casa com ESTA empresa (entra na jogada)
}

/** Relevância da norma para a estrutura do cliente — o cruzamento norma × empresa. */
export function relevanceFor(n: Norm, st: ClientStructure): Relevance {
  const reasons: string[] = [];
  let score = 0;

  // 1) Setor — o sinal mais forte. O setor da norma toca o negócio do cliente?
  const sectors = companySectors(st);
  if (sectors.has(n.sector)) {
    score += 0.4;
    reasons.push(`Setor ${SECTOR_LABEL[n.sector]} — aderente ao negócio do grupo`);
  }

  // 2) Jurisdição — federal aplica-se a todo o grupo; estadual/municipal só se a UF é vigiada.
  const j = norm(n.jurisdiction);
  const federal = n.level === "federal" || j.includes("brasil");
  if (federal) {
    score += 0.15;
    reasons.push("Norma federal — alcança todas as entidades do grupo");
  } else {
    const hitUf = st.jurisdictions.find((uf) => {
      const code = uf.toUpperCase();
      return j.includes(code.toLowerCase()) || (UF_NAME[code] && j.includes(UF_NAME[code]));
    });
    if (hitUf) {
      score += 0.3;
      reasons.push(`Jurisdição ${hitUf} — onde o grupo tem presença`);
    }
  }

  // 3) Regime — a norma menciona o regime tributário atual do cliente?
  const regimeFirst = norm(st.regime).split(/\s+/)[0]; // "lucro" / "simples"
  const normHay = norm(`${n.title} ${n.summary} ${n.body} ${n.tags.join(" ")}`);
  if (regimeFirst.length >= 4 && normHay.includes(norm(st.regime))) {
    score += 0.15;
    reasons.push(`Compatível com o regime ${st.regime}`);
  }

  // 4) Aderência ao perfil livre — quanto do que o USUÁRIO descreveu aparece na norma.
  const profileTokens = tokens(`${st.businessProfile} ${st.mainActivity} ${st.activities.map((a) => a.label).join(" ")}`);
  const normTokens = tokens(`${n.title} ${n.summary} ${n.tags.join(" ")}`);
  const shared = [...profileTokens].filter((tkn) => normTokens.has(tkn));
  if (shared.length > 0) {
    score += Math.min(0.3, shared.length * 0.075);
    reasons.push(`Aderência ao perfil: ${shared.slice(0, 4).join(", ")}`);
  }

  return { score: Math.min(1, Math.round(score * 100) / 100), reasons };
}

// ── Síntese da brecha ────────────────────────────────────────────────────────
const PLAY_TITLE: Record<OpportunityType, string> = {
  credit: "Capturar crédito tributário",
  incentive: "Habilitar incentivo fiscal",
  regime: "Otimizar enquadramento de regime",
  jurisdiction: "Reposicionar domicílio fiscal",
  classification: "Reenquadrar classificação fiscal",
};
// Ganho potencial como fração do faturamento, por tipo de jogada (heurística do demo).
const TYPE_GAIN_RATE: Record<OpportunityType, number> = {
  credit: 0.012, incentive: 0.02, regime: 0.025, jurisdiction: 0.018, classification: 0.008,
};
const REGIME_RATE: Record<string, number> = {
  "Lucro Real": 0.18, "Lucro Presumido": 0.155, "Simples Nacional": 0.095,
};

function classifyType(n: Norm): OpportunityType {
  const hay = norm(`${n.title} ${n.tags.join(" ")}`);
  if (/(crédito|credito|per\/dcomp|ressarci|reintegra|transaç|transac|parcelament|passivo)/.test(hay)) return "credit";
  if (/(sudene|sufram|reidi|repetro|incentiv|subvenç|subvenc|lei do bem|isenç|suspens)/.test(hay)) return "incentive";
  if (/(iss|domicíl|domicil|jurisdiç|jurisdic)/.test(hay)) return "jurisdiction";
  if (/(regime|simples|presumido|lucro real)/.test(hay)) return "regime";
  return "classification";
}

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY).toISOString();
}

/** Sintetiza a Opportunity (brecha) a partir de uma norma relevante + a estrutura. */
export function synthesizeOpportunity(n: Norm, st: ClientStructure, rel: Relevance): Opportunity {
  const type = classifyType(n);
  const baseRate = REGIME_RATE[st.regime] ?? 0.18;
  // Ganho escala com faturamento, tipo da jogada e confiança (relevância).
  const estimatedGain = Math.round(st.annualRevenue * TYPE_GAIN_RATE[type] * (0.5 + 0.5 * rel.score));
  const burdenBefore = Math.round(st.annualRevenue * baseRate);
  const burdenAfter = Math.max(0, burdenBefore - estimatedGain);
  const effort: Level = rel.score >= 0.75 ? "low" : rel.score >= 0.6 ? "medium" : "high";
  const riskAfter = rel.score >= 0.75 ? 22 : rel.score >= 0.6 ? 32 : 44;
  const shortTitle = n.title.length > 64 ? `${n.title.slice(0, 61)}…` : n.title;

  return {
    id: `opp-auto-${n.id}`,
    normId: n.id,
    type,
    title: `${PLAY_TITLE[type]} — ${shortTitle}`,
    summary: `Brecha detectada pelo agente ao cruzar o perfil do grupo com ${n.source.ref}. ${n.summary}`,
    sector: n.sector,
    estimatedGain,
    windowStart: n.effectiveDate || n.publishedAt,
    // Janela: 90 dias a partir da vigência (heurística do demo, determinística).
    windowEnd: addDays(n.effectiveDate || n.publishedAt, 90),
    effort,
    confidence: rel.score,
    status: "open",
    correlatedNorms: 1,
    recommendedMove: {
      headline: `Aproveitar ${n.source.ref} no enquadramento do grupo`,
      fromState: `Estrutura atual — sem capturar a janela aberta por ${n.source.ref}`,
      toState: `Enquadramento que captura o benefício de ${n.title}`,
      // A jogada cita POR QUE casa com esta empresa (os sinais do cruzamento).
      rationale: [
        ...rel.reasons,
        `Disparada por ${n.source.ref} (${n.jurisdiction}), vigência ${n.effectiveDate || n.publishedAt}.`,
      ],
      requirements: [
        "Validação e aprovação do tributarista (human-in-the-loop)",
        "Protocolo/adesão junto ao órgão competente dentro da janela",
        "Memória de cálculo reconciliada com o SPED",
      ],
    },
    simulation: {
      effectiveRateBefore: baseRate,
      effectiveRateAfter: st.annualRevenue > 0 ? Math.round((burdenAfter / st.annualRevenue) * 1e4) / 1e4 : baseRate,
      annualBurdenBefore: burdenBefore,
      annualBurdenAfter: burdenAfter,
      riskBefore: 25,
      riskAfter,
      annualGain: estimatedGain,
      assumptions: [
        `Faturamento-base de R$ ${Math.round(st.annualRevenue).toLocaleString("pt-BR")}/ano`,
        `Regime atual: ${st.regime}`,
        "Estimativa determinística do detector — refine com o simulador e o tributarista",
      ],
    },
    createdAt: n.publishedAt,
  };
}

export interface DetectOpts {
  /** normIds que JÁ têm oportunidade manual/seed — não reabrir como brecha automática. */
  skipNormIds?: Set<string>;
  threshold?: number;
}

/**
 * Detecta brechas: para cada norma relevante (acima do limiar) e ainda sem
 * oportunidade, sintetiza a jogada. Ordena por ganho. Determinístico e puro.
 */
export function detectOpportunities(st: ClientStructure, norms: Norm[], opts: DetectOpts = {}): Opportunity[] {
  const skip = opts.skipNormIds ?? new Set<string>();
  const threshold = opts.threshold ?? DETECT_THRESHOLD;
  const out: Opportunity[] = [];
  for (const n of norms) {
    if (skip.has(n.id)) continue;
    const rel = relevanceFor(n, st);
    if (rel.score < threshold) continue;
    out.push(synthesizeOpportunity(n, st, rel));
  }
  return out.sort((a, b) => b.estimatedGain - a.estimatedGain);
}
