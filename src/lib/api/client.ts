// ─────────────────────────────────────────────────────────────────────────────
// Cliente de API tipado — wrappers fetch sobre as rotas /api/*.
// Sem libs externas; envelope: { data: T, meta?: {...} }.
// Funciona em Server Components, Client Components e Server Actions.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  OpportunityView,
  OppSort,
  OppSummary,
  RadarItem,
  SavingsSummary,
  SavingsRecord,
  ClientStructure,
  AgentRecommendation,
  ExecutionPlan,
  Scenario,
  ScenarioParams,
  ScenarioResult,
  FirmClient,
  PortfolioStats,
  ClientDetail,
  FeatureFlag,
  OrgSettings,
  SystemSettings,
  Invoice,
  BillingSummary,
  AiFeedbackStats,
  PermissionRow,
  OwnerKpis,
  Tenant,
  Plan,
  AuditEntry,
} from "./types";
import { SECTORS } from "@/lib/sectors";

// Envelope universal das rotas do projeto.
type Envelope<T> = { data: T; meta?: Record<string, unknown> };

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const envelope = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(envelope?.error?.message ?? `HTTP ${res.status}`);
  }
  return ((await res.json()) as Envelope<T>).data;
}

/** GET com meta devolvida junto (para sumários embutidos). */
async function getWithMeta<T>(url: string): Promise<Envelope<T>> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<Envelope<T>>;
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const envelope = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(envelope?.error?.message ?? `HTTP ${res.status}`);
  }
  return ((await res.json()) as Envelope<T>).data;
}

async function put<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const envelope = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(envelope?.error?.message ?? `HTTP ${res.status}`);
  }
  return ((await res.json()) as Envelope<T>).data;
}

// ── API client ────────────────────────────────────────────────────────────────

export const api = {
  opportunities: {
    list(params?: { sort?: OppSort; sector?: string; type?: string; status?: string }) {
      const sp = new URLSearchParams();
      if (params?.sort) sp.set("sort", params.sort);
      if (params?.sector) sp.set("sector", params.sector);
      if (params?.type) sp.set("type", params.type);
      if (params?.status) sp.set("status", params.status);
      return get<OpportunityView[]>(`/api/opportunities?${sp.toString()}`);
    },
    async summary(): Promise<OppSummary | null> {
      const env = await getWithMeta<unknown>("/api/opportunities?limit=1");
      return (env.meta?.summary as OppSummary) ?? null;
    },
    get: (id: string) => get<OpportunityView>(`/api/opportunities/${id}`),
  },

  radar: {
    list(params?: { level?: string; sector?: string }) {
      const sp = new URLSearchParams();
      if (params?.level) sp.set("level", params.level);
      if (params?.sector) sp.set("sector", params.sector);
      return get<RadarItem[]>(`/api/radar?${sp.toString()}`);
    },
  },

  savings: {
    get: () => get<SavingsSummary>("/api/savings"),
    reconcile: (id: string) => post<SavingsRecord>("/api/savings/reconcile", { id }),
  },

  structure: {
    get: () => get<ClientStructure>("/api/structure"),
    update: (patch: Partial<ClientStructure>) => put<ClientStructure>("/api/structure", patch),
  },

  settings: {
    get: () => get<OrgSettings>("/api/settings"),
    update: (patch: Partial<OrgSettings>) => put<OrgSettings>("/api/settings", patch),
  },

  simulator: {
    list: () => get<Scenario[]>("/api/simulator"),
    run: (params: ScenarioParams) => post<ScenarioResult>("/api/simulator", params),
    save: (name: string, params: ScenarioParams, result: ScenarioResult) =>
      post<Scenario>("/api/simulator/save", { name, params, result }),
    createOpportunity: (params: ScenarioParams, result: ScenarioResult) =>
      post<OpportunityView>("/api/simulator/opportunity", { params, result }),
  },

  agent: {
    recommendations: () => get<AgentRecommendation[]>("/api/ai/recommendations"),
  },

  clients: {
    list: () => get<{ clients: (FirmClient & { brechasCount: number })[]; portfolio: PortfolioStats }>("/api/clients"),
    get: (id: string) => get<ClientDetail>(`/api/clients/${id}`),
    /** Setores estáticos — lista canônica sem round-trip. */
    sectors: () => Promise.resolve([...SECTORS] as { id: string; label: string }[]),
  },

  execution: {
    list: () => get<{ plans: ExecutionPlan[]; opportunities: OpportunityView[] }>("/api/execution"),
    approve: (id: string, approver: string) =>
      post<ExecutionPlan>(`/api/execution/${id}/approve`, { approver }),
    advance: (planId: string, stepId: string) =>
      post<ExecutionPlan>(`/api/execution/${planId}/advance`, { stepId }),
  },

  owner: {
    flags: () => get<FeatureFlag[]>("/api/owner/flags"),
    snapshot: () => get<{
      kpis: OwnerKpis;
      tenants: Tenant[];
      plans: Plan[];
      flags: FeatureFlag[];
      audit: AuditEntry[];
      aiFeedbackStats: AiFeedbackStats;
    }>("/api/owner"),
    billing: () => getWithMeta<Invoice[]>("/api/owner/billing").then(env => ({
      invoices: env.data,
      summary: (env.meta?.summary ?? { mrr: 0, outstanding: 0, collected: 0 }) as BillingSummary,
    })),
    landing: (locale: string) => get<Record<string, string>>(`/api/owner/landing?locale=${locale}`),
    tenantConfig: (id: string) => get<Record<string, string>>(`/api/owner/tenants/${id}/config`),
    system: () => get<SystemSettings>("/api/owner/system"),
    permissions: () => get<{ matrix: PermissionRow[]; roles: string[] }>("/api/owner/permissions"),
  },
} as const;
