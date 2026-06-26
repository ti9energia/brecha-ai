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

// Pipeline de treino (0A §2.7): coleta → curadoria → eval → versionamento. Valores
// derivados de forma determinística do feedback (demo). SWAP: finetune real + eval
// em holdout + rollout canário com rollback.
export interface TrainingPipeline {
  snapshot: TrainingSnapshot;
  curated: number; // 👍 viram exemplos positivos curados
  evalScore: number; // 0..1 (holdout)
  version: string; // modelo@vN proposto
  status: "collecting" | "ready_to_train" | "evaluated";
}

export function trainingPipeline(): TrainingPipeline {
  const snapshot = trainingSnapshot();
  const curated = Math.round(snapshot.total * snapshot.approvalRate);
  const evalScore = Math.min(0.99, snapshot.approvalRate * 0.9 + (Math.min(snapshot.total, 200) / 200) * 0.1);
  const version = `brecha-fiscal@v${1 + Math.floor(snapshot.total / 100)}`;
  const status: TrainingPipeline["status"] = !snapshot.readyForCuration
    ? "collecting"
    : evalScore >= 0.7
      ? "evaluated"
      : "ready_to_train";
  return { snapshot, curated, evalScore, version, status };
}
