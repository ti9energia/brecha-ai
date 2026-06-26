// ─────────────────────────────────────────────────────────────────────────────
// AI Core · Connector framework (0A §2.5). Pluga sistemas externos (diários
// oficiais, ERPs, seus outros SaaS) — bidirecional. Cada connector = auth +
// capacidades (read/write) + mapeamento de schema + escopo/tenant.
//
// SWAP (produção): cada integração real implementa Connector (estilo MCP) com
// credenciais + sync de verdade; aqui há um connector de demonstração.
// ─────────────────────────────────────────────────────────────────────────────
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
  async sync(_orgId) {
    // SWAP: buscar feeds reais, normalizar para `Norm` e ingerir no KnowledgeStore.
    return { ingested: 0, source: "demo:seed" };
  },
};

const CONNECTORS: Connector[] = [gazetteConnector];

export function listConnectors(): Connector[] {
  return CONNECTORS;
}
export function getConnector(id: string): Connector | undefined {
  return CONNECTORS.find((c) => c.id === id);
}
