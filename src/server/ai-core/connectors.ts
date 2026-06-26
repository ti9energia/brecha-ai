// ─────────────────────────────────────────────────────────────────────────────
// AI Core · Connector framework (0A §2.5). Pluga sistemas externos (diários
// oficiais, ERPs, seus outros SaaS) — bidirecional. Cada connector = auth +
// capacidades (read/write) + mapeamento de schema + escopo/tenant.
//
// SWAP (produção): cada integração real implementa Connector (estilo MCP) com
// credenciais + sync de verdade; aqui há um connector de demonstração.
// ─────────────────────────────────────────────────────────────────────────────
import { ingestDocument } from "./knowledge";
import { listRadar, addRadarNorm } from "@/server/domain/store";
import { parseGazetteFeed } from "./gazette";

export type ConnectorCapability = "read" | "write";

export interface Connector {
  readonly id: string;
  readonly label: string;
  readonly capabilities: ConnectorCapability[];
  /** Conectado/autenticado? (no demo, sempre; em produção valida credenciais). */
  status(): "connected" | "disconnected";
  /** Sincroniza do sistema externo para o AI Core (ingestão no KnowledgeStore). */
  sync(orgId: string): Promise<{ ingested: number; source: string }>;
}

// Connector de demonstração: "Diários Oficiais (BR)". Em produção, leria os
// feeds/APIs reais (DOU/CONFAZ/SEFAZ/DOM…), normalizaria e ingeriria normas.
export const gazetteConnector: Connector = {
  id: "gazette-br",
  label: "Diários Oficiais (BR)",
  capabilities: ["read"],
  status: () => "connected",
  async sync(orgId) {
    // Produção: lê o feed REAL do diário (env GAZETTE_FEED_URL), normaliza para `Norm`,
    // ADICIONA ao radar (vira candidato a brecha do detector) e ingere no RAG do tenant.
    const url = process.env.GAZETTE_FEED_URL;
    if (url) {
      try {
        const res = await fetch(url, { headers: { accept: "application/json" } });
        if (res.ok) {
          const norms = parseGazetteFeed(await res.json());
          let ingested = 0;
          for (const n of norms) {
            addRadarNorm(n); // dedupe por id; alimenta o detector no próximo run
            ingestDocument(orgId, { title: n.title, text: n.summary, ref: n.source.ref });
            ingested++;
          }
          return { ingested, source: `feed: ${url}` };
        }
      } catch {
        // rede/credencial falhou → cai no fallback do seed (o demo nunca quebra).
      }
    }
    // Fallback offline (demo, default zero-config): ingere as normas do radar do seed.
    const norms = listRadar().slice(0, 8);
    for (const n of norms) ingestDocument(orgId, { title: n.title, text: n.summary, ref: n.source.ref });
    return { ingested: norms.length, source: "DOU/CONFAZ/SEFAZ (demo: seed)" };
  },
};

// ERP / contabilidade — leitura do plano de contas/notas (bidirecional).
export const erpConnector: Connector = {
  id: "erp",
  label: "ERP / Contabilidade",
  capabilities: ["read", "write"],
  status: () => "connected",
  async sync(_orgId) {
    // SWAP: ler do ERP real e mapear para a estrutura/economia do tenant.
    return { ingested: 0, source: "demo:erp" };
  },
};

// Assinatura / protocolo de documentos (escrita) — para a execução da jogada.
export const esignConnector: Connector = {
  id: "esign",
  label: "Assinatura / Protocolo",
  capabilities: ["write"],
  status: () => "connected",
  async sync(_orgId) {
    return { ingested: 0, source: "demo:esign" };
  },
};

const CONNECTORS: Connector[] = [gazetteConnector, erpConnector, esignConnector];

export function listConnectors(): Connector[] {
  return CONNECTORS;
}
export function getConnector(id: string): Connector | undefined {
  return CONNECTORS.find((c) => c.id === id);
}
