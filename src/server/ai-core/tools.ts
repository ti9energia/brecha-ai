// ─────────────────────────────────────────────────────────────────────────────
// AI Core · Tools registry (0A §2.4, 0D §1). Cada capacidade da plataforma é uma
// TOOL declarada com schema de entrada + a PERMISSÃO exigida (0C). O AI Core
// descobre as tools (listTools) e as executa de forma governada (invokeTool) —
// é o que faz o copiloto/agente/WhatsApp "conhecerem e operarem o sistema", e
// ganharem automaticamente toda função nova que um módulo registrar.
//
// SWAP (produção): cada MÓDULO declara as suas tools no seu `module.config.ts`
// (0D §1) e o registry as agrega; aqui ficam centralizadas para o demo. Trocar a
// validação ad-hoc por Zod é só tipar `input` com schemas Zod.
// ─────────────────────────────────────────────────────────────────────────────
import {
  listOpportunities, listRadar, getStructure, updateStructure, runScenario, approveExecution, getSavings,
  recordAiAction, isModuleEntitled,
} from "@/server/domain/store";
import type { SessionUser } from "@/server/auth/session";

type Role = SessionUser["role"];

const ALL: Role[] = ["viewer", "member", "manager", "org_admin", "platform_owner"];
const WRITERS: Role[] = ["manager", "org_admin", "platform_owner"]; // aprovam/escrevem

export interface ToolContext {
  role: Role;
  userName: string;
  entitlements?: string[]; // módulos liberados pelo plano (0C §4.4) — opcional p/ retrocompat
}
export interface Tool {
  id: string; // "recurso:ação"
  module: string;
  description: string; // para o modelo entender a capacidade
  permission: Role[]; // RBAC (0C) — quem pode invocar
  input: Record<string, "string" | "number">; // contrato de entrada (Zod em produção)
  run: (input: Record<string, unknown>, ctx: ToolContext) => unknown;
}

// Tools da plataforma Brecha.ai (08 §12).
export const TOOLS: Tool[] = [
  { id: "opportunities:read", module: "opportunities", description: "Lista as oportunidades abertas ranqueadas por ganho.", permission: ALL, input: {}, run: () => listOpportunities({ sort: "gain" }) },
  { id: "radar:read", module: "radar", description: "Lê o fluxo de mudanças normativas relevantes.", permission: ALL, input: {}, run: () => listRadar() },
  { id: "structure:read", module: "structure", description: "Lê o perfil fiscal/jurídico do cliente.", permission: ALL, input: {}, run: () => getStructure() },
  { id: "structure:update", module: "structure", description: "Atualiza campos do perfil fiscal/jurídico.", permission: WRITERS, input: { legalName: "string", regime: "string", headquarters: "string", annualRevenue: "number" }, run: (input) => updateStructure(input) },
  { id: "simulator:run", module: "simulator", description: "Roda o motor fiscal sobre um cenário (regime, jurisdição, enquadramento, faturamento).", permission: ALL, input: { regime: "string", jurisdiction: "string", classification: "string", revenue: "number" }, run: (input) => runScenario({ regime: String(input.regime ?? "Lucro Real"), jurisdiction: String(input.jurisdiction ?? "SP"), classification: String(input.classification ?? "Indústria metalúrgica"), revenue: Number(input.revenue ?? 0) }) },
  { id: "execution:start", module: "execution", description: "Aprova a execução de uma oportunidade (aprovação humana do tributarista).", permission: WRITERS, input: { opportunityId: "string" }, run: (input, ctx) => approveExecution(String(input.opportunityId ?? ""), ctx.userName) },
  { id: "savings:read", module: "savings", description: "Lê a economia capturada e a base do success fee.", permission: ALL, input: {}, run: () => getSavings() },
];

// Ordem dos papéis (do menor ao maior privilégio) para a matriz de permissões (0C §2.10).
export const ROLES_ORDER: Role[] = ["viewer", "member", "manager", "org_admin", "platform_owner"];

/** Matriz de permissões (0C §2.10): por tool (recurso:ação), quais papéis podem
 *  invocar. Derivada da fonte da verdade (TOOLS) — o que a UI/API/IA/WhatsApp usam. */
export function permissionMatrix(): { id: string; module: string; roles: Record<Role, boolean> }[] {
  return TOOLS.map((t) => ({
    id: t.id,
    module: t.module,
    roles: Object.fromEntries(ROLES_ORDER.map((r) => [r, t.permission.includes(r)])) as Record<Role, boolean>,
  }));
}

/** Tools que um papel pode ver/usar (0A §2.8 — permissão-aware) e que o PLANO libera
 *  (0C §4.4: acesso = papel E plano). Sem `entitlements`, filtra só por papel. */
export function listTools(role: Role, entitlements?: string[]): Tool[] {
  return TOOLS.filter((t) => t.permission.includes(role) && (!entitlements || isModuleEntitled(t.module, entitlements)));
}

export type ToolResult =
  | { ok: true; toolId: string; data: unknown }
  | { ok: false; error: "NOT_FOUND" | "FORBIDDEN" };

/** Execução governada (0A §2.9, POST /ai/tools/invoke): checa RBAC e roda. */
export function invokeTool(id: string, input: Record<string, unknown>, ctx: ToolContext): ToolResult {
  const tool = TOOLS.find((t) => t.id === id);
  if (!tool) {
    recordAiAction({ actor: ctx.userName, action: `tool:${id}`, detail: "não encontrada" });
    return { ok: false, error: "NOT_FOUND" };
  }
  if (!tool.permission.includes(ctx.role)) {
    recordAiAction({ actor: ctx.userName, action: `tool:${id}`, detail: `negada (papel ${ctx.role})` });
    return { ok: false, error: "FORBIDDEN" };
  }
  if (ctx.entitlements && !isModuleEntitled(tool.module, ctx.entitlements)) {
    recordAiAction({ actor: ctx.userName, action: `tool:${id}`, detail: `negada (plano não inclui ${tool.module})` });
    return { ok: false, error: "FORBIDDEN" };
  }
  const data = tool.run(input, ctx);
  recordAiAction({ actor: ctx.userName, action: `tool:${id}`, detail: "executada" });
  return { ok: true, toolId: id, data };
}
