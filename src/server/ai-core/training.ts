// ─────────────────────────────────────────────────────────────────────────────
// AI Core · Pipeline de treino (0A §2.7). A captura de feedback já acontece em
// store.recordAiFeedback (👍/👎 do copiloto). Aqui: um snapshot do dataset.
//
// SWAP (produção): exportar os exemplos (prompt, resposta, rating, correção) por
// tenant com consentimento → curadoria → finetune/eval → versionamento
// (modelo@vN) com rollout canário e rollback. O selfHostedProvider (provider.ts)
// consome o modelo treinado — sem tocar no produto.
// ─────────────────────────────────────────────────────────────────────────────
import { aiFeedbackStats } from "@/server/domain/store";

export interface TrainingSnapshot {
  total: number;
  approvalRate: number; // 0..1 — proporção de 👍
  readyForCuration: boolean;
}

export function trainingSnapshot(): TrainingSnapshot {
  const s = aiFeedbackStats();
  return {
    total: s.total,
    approvalRate: s.total ? s.up / s.total : 0,
    readyForCuration: s.total >= 50, // limiar ilustrativo p/ disparar curadoria
  };
}
