// Helpers de UI de oportunidade compartilhados — evita duplicação entre o card,
// o detalhe e o instrumento do herói (antes a fórmula do anel e o peso de esforço
// estavam copiados em 3 lugares). NÃO inclui o mapa status→tom: ele varia por
// contexto (card vs execução vs detalhe), então fica local em cada um de propósito.

// Dias até a janela "encher" o anel da Abertura.
export const OPP_MAX_WINDOW = 120;

// Fração 0..1 do anel: chega a 1 (cheio) cedo e nunca abaixo de 0.05 (sempre visível).
export function apertureFraction(daysRemaining: number, maxWindow = OPP_MAX_WINDOW): number {
  return Math.min(1, Math.max(0.05, daysRemaining / maxWindow));
}

// Peso do esforço para o Meter (low/medium/high → 0..1).
export const EFFORT_VALUE: Record<"low" | "medium" | "high", number> = { low: 0.33, medium: 0.66, high: 1 };
