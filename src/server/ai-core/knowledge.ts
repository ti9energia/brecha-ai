// ─────────────────────────────────────────────────────────────────────────────
// AI Core · Knowledge / RAG (0A §2.2). Recuperação por tenant para dar grounding
// ao modelo. Hoje: índice keyword in-memory sobre os dados do domínio (norms,
// oportunidades, estrutura). Determinístico, sem deps.
//
// SWAP (produção): trocar a implementação por pgvector/Qdrant (embeddings + ANN),
// com ingestão contínua via connectors, MANTENDO a interface KnowledgeStore — o
// resto do AI Core não muda.
// ─────────────────────────────────────────────────────────────────────────────
import { listOpportunities, listRadar, getStructure } from "@/server/domain/store";

export interface KnowledgeChunk {
  id: string;
  kind: "opportunity" | "norm" | "structure";
  text: string;
  ref?: string;
}
export interface Retrieved extends KnowledgeChunk {
  score: number;
}
export interface KnowledgeStore {
  readonly id: string;
  /** Chunks mais relevantes para a consulta (isolado por tenant via orgId). */
  retrieve(query: string, orgId: string, k?: number): Retrieved[];
}

function corpus(): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];
  for (const o of listOpportunities({ status: "all" })) {
    chunks.push({ id: `opp:${o.id}`, kind: "opportunity", text: `${o.title} ${o.summary} ${o.recommendedMove.headline}`, ref: o.norm.source.ref });
  }
  for (const n of listRadar()) {
    chunks.push({ id: `norm:${n.id}`, kind: "norm", text: `${n.title} ${n.summary} ${n.tags.join(" ")}`, ref: n.source.ref });
  }
  const s = getStructure();
  chunks.push({ id: "structure", kind: "structure", text: `${s.legalName} ${s.regime} ${s.mainActivity} ${s.jurisdictions.join(" ")}` });
  return chunks;
}

// Documentos ingeridos por tenant (via /ai/ingest e connectors/:id/sync) — 0A §2.2.
// Isolados por orgId: cada tenant só recupera o que foi ingerido para ele (+ o
// corpus de domínio do demo). Em produção, pgvector com namespace por tenant.
const INGESTED: Record<string, KnowledgeChunk[]> = {};
let ingestSeq = 0;

export function ingestDocument(orgId: string, doc: { title: string; text: string; ref?: string }): KnowledgeChunk {
  const chunk: KnowledgeChunk = {
    id: `ingest:${orgId}:${++ingestSeq}`,
    kind: "norm",
    text: `${doc.title} ${doc.text}`.slice(0, 4000),
    ref: doc.ref,
  };
  (INGESTED[orgId] ??= []).push(chunk);
  return chunk;
}
export function ingestedCount(orgId: string): number {
  return INGESTED[orgId]?.length ?? 0;
}

export const inMemoryKnowledge: KnowledgeStore = {
  id: "in-memory",
  retrieve(query, orgId, k = 4) {
    const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
    if (terms.length === 0) return [];
    // corpus de domínio (demo) + o que ESTE tenant ingeriu (isolamento por orgId).
    const all = [...corpus(), ...(INGESTED[orgId] ?? [])];
    return all
      .map((c) => {
        const hay = c.text.toLowerCase();
        const score = terms.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
        return { ...c, score };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  },
};
