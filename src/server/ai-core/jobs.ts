// ─────────────────────────────────────────────────────────────────────────────
// AI Core · Jobs agendados (0A §4 / 08 §6). Em produção, cron/Vercel Queues dispara
// isto periodicamente. Roda os connectors de LEITURA (ingestão contínua no RAG do
// tenant) + o agente autônomo (recomendações). Tudo auditado via as camadas abaixo.
// ─────────────────────────────────────────────────────────────────────────────
import { listConnectors } from "./connectors";
import { agentRun } from "./agent";

export interface JobsResult {
  synced: number;
  ingested: number;
  recommendations: number;
}

export async function runScheduledJobs(orgId: string): Promise<JobsResult> {
  let synced = 0;
  let ingested = 0;
  for (const c of listConnectors()) {
    if (c.capabilities.includes("read")) {
      const r = await c.sync(orgId);
      synced++;
      ingested += r.ingested;
    }
  }
  const recs = agentRun();
  return { synced, ingested, recommendations: recs.length };
}
