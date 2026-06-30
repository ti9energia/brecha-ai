// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeStore com pgvector (Onda 3). Ativa quando DATABASE_URL está setado.
// Schema usa Float[] como placeholder (Onda 3 completo migra para tipo nativo
// `vector` da extensão pgvector). A similaridade cosseno fica JS-side por ora;
// em Onda 3 completo trocar por operador `<=>` no SQL bruto.
//
// SWAP: quando EMBEDDINGS_PROVIDER estiver configurado, substituir
//       deterministicEmbedding() por chamada real (Voyage AI / OpenAI).
// SWAP: quando pgvector nativo estiver ativo, substituir o loop JS por:
//       SELECT id, title, summary, source,
//              1 - (embedding <=> $1::vector) AS score
//       FROM "Norm" ORDER BY score DESC LIMIT $2
// ─────────────────────────────────────────────────────────────────────────────

import type { KnowledgeStore, Retrieved } from "./knowledge";

// Dimensão do embedding determinístico — intencional pequena (testável sem deps).
const DIM = 32;

/**
 * Embedding determinístico: hash da string → vetor Float32 unitário.
 * Zero-config, testável, sem chamada de rede.
 * // SWAP: substituir por provider real quando EMBEDDINGS_PROVIDER="voyage"|"openai".
 */
function deterministicEmbedding(text: string): number[] {
  const vec = new Array<number>(DIM).fill(0);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    vec[i % DIM] += c * (i + 1);
  }
  // Normaliza → vetor unitário (pré-requisito para cosine similarity)
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

/** Similaridade cosseno entre dois vetores (−1…1; mais alto = mais similar). */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// ── Implementação Postgres / pgvector ─────────────────────────────────────────

class PgvectorKnowledgeStore implements KnowledgeStore {
  readonly id = "pgvector";

  async retrieve(query: string, _orgId: string, k = 4): Promise<Retrieved[]> {
    // Import dinâmico: evita instanciar Prisma em ambientes sem DATABASE_URL.
    let getPrisma: () => import("@prisma/client").PrismaClient;
    try {
      ({ getPrisma } = await import("../db/client"));
    } catch {
      return [];
    }

    const prisma = getPrisma();
    const queryVec = deterministicEmbedding(query.toLowerCase());
    // // SWAP: queryVec = await realEmbedding(query) quando EMBEDDINGS_PROVIDER.

    // Busca normas com embedding no Postgres. Float[] (placeholder) → similaridade JS-side.
    // // SWAP (pgvector nativo): usar prisma.$queryRaw com operador `<=>`.
    const norms = await prisma.norm.findMany({
      select: { id: true, title: true, summary: true, source: true, embedding: true },
      where: { embedding: { isEmpty: false } },
      take: 100, // limite razoável antes do ANN nativo
    });

    return norms
      .map((n) => {
        const sim = cosineSimilarity(queryVec, n.embedding as number[]);
        const src = n.source as { ref?: string };
        return {
          id: `norm:${n.id}`,
          kind: "norm" as const,
          text: `${n.title} ${n.summary}`,
          ref: src?.ref,
          score: sim,
        } satisfies Retrieved;
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}

// ── Factory singleton ─────────────────────────────────────────────────────────

let _store: KnowledgeStore | null = null;

/**
 * getKnowledgeStore() — devolve o KnowledgeStore configurado.
 * - DATABASE_URL presente → PgvectorKnowledgeStore (Postgres)
 * - caso contrário       → inMemoryKnowledge (keyword, zero-config)
 */
export function getKnowledgeStore(): KnowledgeStore {
  if (!_store) {
    if (process.env.DATABASE_URL) {
      _store = new PgvectorKnowledgeStore();
    } else {
      // Require dinâmico evita circular: knowledge → knowledgePgvector → knowledge.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("./knowledge") as typeof import("./knowledge");
      _store = mod.inMemoryKnowledge;
    }
  }
  return _store;
}

/** Para testes: reseta o singleton do KnowledgeStore. */
export function __resetKnowledgeStore(): void {
  _store = null;
}
