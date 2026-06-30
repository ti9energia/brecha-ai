"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown, Building2, CreditCard, ToggleLeft, ScrollText, TrendingUp,
  Sparkles, ArrowUpRight, ShieldCheck, Plus, FileText, Wallet, Settings, Check,
  Users, Bot, Plug, RefreshCw, Play, Loader2, Lock, Unlock, UserPlus, Pencil, Globe,
} from "lucide-react";
import {
  ownerKpis, listTenants, getPlans, listFlags, ownerAudit, aiFeedbackStats,
  createTenant, setTenantStatus, updatePlan, getLandingContent, updateLandingContent, LANDING_FIELDS,
  listInvoices, billingSummary, markInvoicePaid, generateInvoice, type Invoice,
  getTenantConfig, updateTenantConfig,
  getSystemSettings, updateSystemSettings, type SystemSettings,
} from "@/server/domain/store";
import { permissionMatrix, ROLES_ORDER } from "@/server/ai-core/tools";
import type { Tenant, Plan, FeatureFlag } from "@/server/domain/types";
import { locales, localeMeta, type Locale } from "@/i18n/config";
import { useFormatter, useTranslations } from "@/i18n/provider";
import { useToast } from "@/ui/Toast";
import { useSession } from "@/workspace/session";
import { useFlags } from "@/workspace/flags";
import { ViewScroll, ViewHeader, StatTiles, StatTile, writeJson, writeErrorKey } from "./shared";
import { SectorIcon } from "@/ui/SectorIcon";
import { Button, Chip, Meter } from "@/ui/primitives";
import { cn } from "@/ui/cn";

type Section = "overview" | "tenants" | "users" | "plans" | "billing" | "landing" | "config" | "ai" | "flags" | "system" | "audit";

export function OwnerView() {
  const t = useTranslations("owner");
  const tc = useTranslations("common");
  const fmt = useFormatter();
  const user = useSession();
  const [section, setSection] = useState<Section>("overview");
  // Mutações do CRUD bumpam o tick → re-lê o store in-memory (mesmo padrão da Execução).
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const k = useMemo(() => ownerKpis(), []);
  const tenants = useMemo(() => [...listTenants()], [tick]);
  const plans = useMemo(() => [...getPlans()], [tick]);
  const flags = useMemo(() => listFlags(), []);
  const audit = useMemo(() => [...ownerAudit()], [tick]);

  const tabs: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: t("overview"), icon: <TrendingUp size={14} /> },
    { id: "tenants", label: t("tenants"), icon: <Building2 size={14} /> },
    { id: "users", label: t("users"), icon: <Users size={14} /> },
    { id: "plans", label: t("plans"), icon: <CreditCard size={14} /> },
    { id: "billing", label: t("billing"), icon: <Wallet size={14} /> },
    { id: "landing", label: t("landing"), icon: <FileText size={14} /> },
    { id: "config", label: t("config"), icon: <Settings size={14} /> },
    { id: "ai", label: t("ai"), icon: <Bot size={14} /> },
    { id: "flags", label: t("flags"), icon: <ToggleLeft size={14} /> },
    { id: "system", label: t("system"), icon: <Globe size={14} /> },
    { id: "audit", label: t("audit"), icon: <ScrollText size={14} /> },
  ];

  // RBAC defense-in-depth: só platform_owner vê o painel do dono.
  if (user.role !== "platform_owner") {
    return (
      <ViewScroll>
        <div className="panel hairline p-12 text-center">
          <ShieldCheck size={28} className="mx-auto text-ink-4 mb-4" />
          <h2 className="font-display font-semibold text-ink">{t("title")}</h2>
          <p className="mt-2 text-sm text-ink-3">{t("restricted")}</p>
        </div>
      </ViewScroll>
    );
  }

  return (
    <ViewScroll>
      <ViewHeader
        icon={<Crown size={20} />}
        eyebrow={t("you")}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-line bg-surface-2 mono text-[0.72rem] uppercase tracking-[0.14em] text-ink-3">
            <ShieldCheck size={12} className="text-brand" />
            super-admin · 0C
          </span>
        }
      />

      {/* sub-tabs (segmented control) */}
      <div className="mb-7 overflow-x-auto no-scrollbar">
        <div role="tablist" className="inline-flex items-center gap-1 p-1 rounded-[var(--radius-md)] border border-line bg-surface-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={section === tab.id}
              onClick={() => setSection(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 h-8 rounded-[var(--radius-sm)] text-sm whitespace-nowrap transition-colors",
                section === tab.id ? "bg-surface-4 text-ink" : "text-ink-3 hover:text-ink",
              )}
            >
              <span className={cn(section === tab.id ? "text-brand" : "text-ink-4")}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {section === "overview" && <Overview k={k} t={t} tc={tc} fmt={fmt} />}
      {section === "tenants" && <Tenants rows={tenants} t={t} fmt={fmt} refresh={refresh} />}
      {section === "users" && <UsersTab t={t} />}
      {section === "plans" && <Plans rows={plans} t={t} fmt={fmt} refresh={refresh} />}
      {section === "billing" && <Billing t={t} fmt={fmt} refresh={refresh} tenants={tenants} />}
      {section === "landing" && <LandingCms t={t} />}
      {section === "config" && <Config t={t} tenants={tenants} />}
      {section === "ai" && <AiPanel t={t} fmt={fmt} />}
      {section === "flags" && <Flags rows={flags} t={t} />}
      {section === "system" && <SystemSection t={t} />}
      {section === "audit" && <Audit rows={audit} t={t} fmt={fmt} />}
    </ViewScroll>
  );
}

type Tr = ReturnType<typeof useTranslations>;
type Fmt = ReturnType<typeof useFormatter>;

// ── OVERVIEW ─────────────────────────────────────────────────────────────────
function Overview({ k, t, tc, fmt }: { k: ReturnType<typeof ownerKpis>; t: Tr; tc: Tr; fmt: Fmt }) {
  const fb = aiFeedbackStats();
  const aiSat = fb.total ? Math.round((fb.up / fb.total) * 100) : 0;
  return (
    <div>
      <StatTiles>
        <StatTile
          label={t("mrr")}
          value={fmt.money(k.mrr)}
          accent="gold"
          hint={
            <span className="inline-flex items-center gap-1 text-positive">
              <ArrowUpRight size={11} />+{fmt.percent(k.mrrDelta)}
              <span className="text-ink-4">{tc("perYear")}</span>
            </span>
          }
        />
        <StatTile
          label={t("activeTenants")}
          value={fmt.number(k.activeTenants)}
          accent="info"
          hint={<span className="inline-flex items-center gap-1 text-positive"><ArrowUpRight size={11} />+{k.tenantsDelta} <span className="text-ink-4">·30d</span></span>}
        />
        <StatTile label={t("aiSpend")} value={fmt.money(k.aiSpend)} accent="info" hint={tc("estimated") + " · " + tc("perYear")} />
        <StatTile label={t("captured")} value={fmt.moneyCompact(k.capturedNet)} accent="positive" hint={tc("realized")} />
      </StatTiles>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
        {/* MRR sparkline */}
        <div className="panel hairline p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="eyebrow mb-2">{t("mrr")}</p>
              <p className="font-display font-semibold text-2xl tnum text-brand leading-none">{fmt.money(k.mrr)}</p>
            </div>
            <span className="inline-flex items-center gap-1 chip text-positive border-[color:var(--positive)]/25 bg-[var(--positive-soft)]">
              <TrendingUp size={12} />+{fmt.percent(k.mrrDelta)}
            </span>
          </div>
          <Sparkline series={k.mrrSeries} />
          <div className="mt-3 flex items-center justify-between mono text-[0.7rem] text-ink-4">
            <span>{fmt.money(k.mrrSeries[0] * 1000)}</span>
            <span className="text-ink-3">{t("last12m")}</span>
            <span className="text-brand">{fmt.money(k.mrrSeries[k.mrrSeries.length - 1] * 1000)}</span>
          </div>
        </div>

        {/* errorRate + health line */}
        <div className="panel hairline p-5 flex flex-col">
          <p className="eyebrow mb-2">{t("errorRate")}</p>
          <p className="font-display font-semibold text-2xl tnum text-positive leading-none">{fmt.percent(k.errorRate)}</p>
          <p className="mt-1.5 text-xs text-ink-4">p99 · 24h</p>

          <div className="mt-5 pt-5 border-t border-line space-y-3.5">
            <HealthRow label={t("health")} value="99,98%" tone="positive" />
            <HealthRow label={t("aiSpend")} value={fmt.money(k.aiSpend)} tone="info" />
            <HealthRow label={t("activeTenants")} value={fmt.number(k.activeTenants)} tone="gold" />
            <HealthRow label={t("aiSatisfaction")} value={`${aiSat}% · ${fmt.number(fb.total)}`} tone="positive" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthRow({ label, value, tone }: { label: string; value: string; tone: "positive" | "info" | "gold" }) {
  const dot = tone === "positive" ? "bg-positive" : tone === "info" ? "bg-info" : "bg-brand";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-sm text-ink-3">
        <span className={cn("size-1.5 rounded-full", dot)} />
        {label}
      </span>
      <span className="mono text-sm text-ink-2 tnum">{value}</span>
    </div>
  );
}

// Hand-rolled SVG line/area sparkline — gold stroke, soft gold area fill, last point dot.
function Sparkline({ series }: { series: number[] }) {
  const W = 640;
  const H = 132;
  const PAD = 6;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  const pts = series.map((v, i) => {
    const x = PAD + (i / (series.length - 1)) * innerW;
    const y = PAD + innerH - ((v - min) / span) * innerH;
    return [x, y] as const;
  });

  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${(H - PAD).toFixed(1)} L${pts[0][0].toFixed(1)},${(H - PAD).toFixed(1)} Z`;
  const [lx, ly] = pts[pts.length - 1];
  const gridY = [0.25, 0.5, 0.75].map((f) => PAD + innerH * f);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[132px] block" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="brc-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {gridY.map((y, i) => (
        <line key={i} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 5" />
      ))}
      <path d={area} fill="url(#brc-spark-fill)" />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {/* last point */}
      <circle cx={lx} cy={ly} r="4.5" fill="var(--brand-bright)" stroke="var(--surface)" strokeWidth="2" />
      <circle cx={lx} cy={ly} r="9" fill="var(--brand)" opacity="0.16" />
    </svg>
  );
}

// ── TENANTS ──────────────────────────────────────────────────────────────────
const TENANT_STATUS: Record<Tenant["status"], { tone: "positive" | "info" | "warning" | "danger"; key: string }> = {
  active: { tone: "positive", key: "active" },
  trial: { tone: "info", key: "trial" },
  past_due: { tone: "warning", key: "past_due" },
  suspended: { tone: "danger", key: "suspended" },
};
function Tenants({ rows, t, fmt, refresh }: { rows: Tenant[]; t: Tr; fmt: Fmt; refresh: () => void }) {
  const { toast } = useToast();
  const tc = useTranslations("common");
  const router = useRouter();

  // Impersonação real (0C §2.2): re-emite o cookie de sessão como o tenant e recarrega
  // o workspace (router.refresh re-lê a sessão no servidor). Banner + "encerrar" no TopBar.
  async function impersonate(tn: Tenant) {
    try {
      const res = await fetch(`/api/owner/tenants/${tn.id}/impersonate`, { method: "POST" });
      if (res.ok) {
        toast({ title: t("impersonateBanner", { tenant: tn.name }), tone: "info" });
        router.refresh();
      } else {
        toast({ title: t("impersonate"), description: tn.name, tone: "error" });
      }
    } catch {
      toast({ title: t("impersonate"), description: tn.name, tone: "error" });
    }
  }

  // Padrão do demo: muta o store client-side (UI atualiza no refresh) e espelha no
  // endpoint admin (servidor, com RBAC). 0C §2.2. Se o servidor recusar (429/erro),
  // avisa em vez de fingir sucesso silenciosamente.
  async function setStatus(tn: Tenant) {
    const status = tn.status === "suspended" ? "active" : "suspended";
    setTenantStatus(tn.id, status);
    refresh();
    const res = await writeJson(`/api/owner/tenants/${tn.id}`, { status }, "PATCH");
    if (!res.ok) {
      toast({ title: tc("saveErrorTitle"), description: tc(writeErrorKey(res.status)), tone: "error" });
      return;
    }
    toast({ title: tn.name, description: t(`tenantStatus.${status}`), tone: status === "suspended" ? "warning" : "success" });
  }
  async function create() {
    const created = createTenant({ name: "Nova Holding S.A.", plan: "plan-structure", sector: "industry" });
    refresh();
    const res = await writeJson("/api/owner/tenants", { name: created.name, plan: created.plan, sector: created.sector }, "POST");
    if (!res.ok) {
      toast({ title: tc("saveErrorTitle"), description: tc(writeErrorKey(res.status)), tone: "error" });
      return;
    }
    toast({ title: t("tenantCreated"), description: created.name, tone: "success" });
  }

  return (
   <div className="space-y-3">
    <div className="flex justify-end">
      <Button variant="secondary" size="sm" onClick={create}><Plus size={14} />{t("newTenant")}</Button>
    </div>
    <div className="panel hairline overflow-hidden">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[820px] text-sm border-collapse">
          <thead>
            <tr className="border-b border-line">
              {[t("tenants"), t("plan"), t("system"), t("mrr"), t("users"), t("captured"), ""].map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    "eyebrow px-4 py-3 font-medium",
                    i === 0 ? "text-left" : i === 6 ? "text-right" : "text-right",
                    i === 0 && "pl-5",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((tn) => {
              const st = TENANT_STATUS[tn.status];
              return (
                <tr key={tn.id} className="border-b border-line last:border-0 hover:bg-surface-2/60 transition-colors">
                  <td className="px-4 pl-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid place-items-center size-8 rounded-[var(--radius-sm)] border border-line bg-surface-2 text-ink-3 shrink-0">
                        <SectorIcon name={tn.sector} size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-ink font-medium truncate">{tn.name}</p>
                        <p className="mono text-[0.7rem] text-ink-4 uppercase">{tn.locale}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right"><Chip tone="neutral">{tn.plan}</Chip></td>
                  <td className="px-4 py-3.5 text-right"><Chip tone={st.tone}>{t(`tenantStatus.${tn.status}`)}</Chip></td>
                  <td className="px-4 py-3.5 text-right tnum text-ink-2">{tn.mrr > 0 ? fmt.money(tn.mrr) : <span className="text-ink-4">—</span>}</td>
                  <td className="px-4 py-3.5 text-right tnum text-ink-3">{fmt.number(tn.users)}</td>
                  <td className="px-4 py-3.5 text-right tnum text-positive">{fmt.moneyCompact(tn.capturedNet)}</td>
                  <td className="px-4 pr-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setStatus(tn)}>
                        {tn.status === "suspended" ? t("reactivate") : t("suspend")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => impersonate(tn)}>
                        {t("impersonate")}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
   </div>
  );
}

// ── PLANS ────────────────────────────────────────────────────────────────────
// Módulos que um plano pode liberar (0C §2.4 — casa com isModuleEntitled no store).
const ALL_ENTITLEMENTS = ["radar", "structure", "opportunities", "simulator", "execution", "savings", "agent", "copilot", "whatsapp", "connectors"];

function Plans({ rows, t, fmt, refresh }: { rows: Plan[]; t: Tr; fmt: Fmt; refresh: () => void }) {
  const { toast } = useToast();
  const tc = useTranslations("common");
  // Edição de preço/quotas: estado local por plano.
  const [editing, setEditing] = useState<Record<string, { price: string; users: string; jurisdictions: string; aiCredits: string }>>({});

  function startEdit(p: Plan) {
    setEditing((e) => ({
      ...e,
      [p.id]: {
        price: String(p.price),
        users: String(p.quotas.users),
        jurisdictions: String(p.quotas.jurisdictions),
        aiCredits: String(p.quotas.aiCredits),
      },
    }));
  }

  async function saveEdit(p: Plan) {
    const ed = editing[p.id];
    if (!ed) return;
    const price = parseFloat(ed.price);
    const quotas = { users: parseInt(ed.users), jurisdictions: parseInt(ed.jurisdictions), aiCredits: parseInt(ed.aiCredits) };
    if (!isFinite(price) || price < 0) return;
    updatePlan(p.id, { price, quotas });
    refresh();
    const res = await writeJson(`/api/owner/plans/${p.id}`, { price, quotas }, "PUT");
    if (!res.ok) {
      toast({ title: tc("saveErrorTitle"), description: tc(writeErrorKey(res.status)), tone: "error" });
      return;
    }
    setEditing((e) => { const n = { ...e }; delete n[p.id]; return n; });
    toast({ title: t("planSaved"), description: p.name, tone: "success" });
  }

  async function toggleEnt(p: Plan, mod: string) {
    const next = p.entitlements.includes(mod) ? p.entitlements.filter((e) => e !== mod) : [...p.entitlements, mod];
    updatePlan(p.id, { entitlements: next });
    refresh();
    const res = await writeJson(`/api/owner/plans/${p.id}`, { entitlements: next }, "PUT");
    if (!res.ok) {
      toast({ title: tc("saveErrorTitle"), description: tc(writeErrorKey(res.status)), tone: "error" });
      return;
    }
    toast({ title: t("planSaved"), description: p.name, tone: "success" });
  }

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
      {rows.map((p) => {
        const ed = editing[p.id];
        return (
          <div
            key={p.id}
            className={cn(
              "relative panel p-5 flex flex-col",
              p.popular ? "border border-line-gold gold-edge" : "hairline",
            )}
          >
            {p.popular && (
              <span className="absolute top-4 right-4 inline-flex items-center gap-1 chip text-brand border-[color:var(--border-gold)] bg-[var(--brand-soft)]">
                <Sparkles size={11} />{t("popular")}
              </span>
            )}
            <h3 className="font-display font-semibold text-lg text-ink">{p.name}</h3>
            <p className="mt-0.5 text-sm text-ink-3 text-pretty max-w-[18rem]">{p.tagline}</p>

            {/* Preço — exibição ou edição */}
            {ed ? (
              <div className="mt-4 space-y-2">
                <label className="block">
                  <span className="text-[0.7rem] text-ink-4 uppercase tracking-wide">Preço/mês (R$)</span>
                  <input className="input mt-0.5" type="number" min="0" step="1" value={ed.price} onChange={(e) => setEditing((s) => ({ ...s, [p.id]: { ...s[p.id], price: e.target.value } }))} />
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["users", "jurisdictions", "aiCredits"] as const).map((k) => (
                    <label key={k} className="block">
                      <span className="text-[0.65rem] text-ink-4 uppercase tracking-wide">{k}</span>
                      <input className="input mt-0.5" type="number" min="0" step="1" value={ed[k]} onChange={(e) => setEditing((s) => ({ ...s, [p.id]: { ...s[p.id], [k]: e.target.value } }))} />
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  <Button variant="primary" size="sm" onClick={() => saveEdit(p)}>{tc("save")}</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing((s) => { const n = { ...s }; delete n[p.id]; return n; })}>{tc("cancel")}</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-display font-bold text-2xl tnum text-ink">{fmt.money(p.price)}</span>
                  <span className="text-sm text-ink-4">{t("perMonth")}</span>
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => startEdit(p)}><Pencil size={13} /></Button>
                </div>
                {p.feeRate > 0 && (
                  <p className="mt-1.5 inline-flex w-fit items-center gap-1 chip text-positive border-[color:var(--positive)]/25 bg-[var(--positive-soft)]">
                    + {fmt.percent(p.feeRate)} {t("successFee")}
                  </p>
                )}
                <div className="mt-5 pt-5 border-t border-line">
                  <p className="eyebrow mb-2.5">{t("quotas")}</p>
                  <dl className="space-y-2 text-sm">
                    <QuotaRow label={t("users")} value={p.quotas.users} />
                    <QuotaRow label={t("jurisdictions")} value={p.quotas.jurisdictions} />
                    <QuotaRow label={t("aiCredits")} value={p.quotas.aiCredits} />
                  </dl>
                </div>
              </>
            )}

            <div className="mt-5 pt-5 border-t border-line">
              <p className="eyebrow mb-1">{t("entitlements")}</p>
              <p className="text-[0.68rem] text-ink-4 mb-2.5">{t("editEntitlements")}</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_ENTITLEMENTS.map((e) => {
                  const on = p.entitlements.includes(e);
                  return (
                    <button
                      key={e}
                      onClick={() => toggleEnt(p, e)}
                      aria-pressed={on}
                      className={cn(
                        "chip mono text-[0.68rem] transition-colors",
                        on ? "text-brand border-[color:var(--border-gold)] bg-[var(--brand-soft)]" : "text-ink-4 border-line bg-surface-2 hover:text-ink-2",
                      )}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuotaRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-3">{label}</dt>
      <dd className="mono tnum text-ink-2">{value}</dd>
    </div>
  );
}

// ── CONFIG por tenant + matriz de permissões (0C §2.8/2.9/2.10) ────────────────
function Config({ t, tenants }: { t: Tr; tenants: Tenant[] }) {
  const { toast } = useToast();
  const ts = useTranslations("settings");
  const tc = useTranslations("common");
  const [tid, setTid] = useState<string>(tenants[0]?.id ?? "");
  const [cfg, setCfg] = useState<Record<string, string>>(() => ({ ...getTenantConfig(tenants[0]?.id ?? "") }));
  const matrix = permissionMatrix();

  function pick(id: string) {
    setTid(id);
    setCfg({ ...getTenantConfig(id) });
  }
  async function save() {
    updateTenantConfig(tid, cfg);
    const res = await writeJson(`/api/owner/tenants/${tid}/config`, cfg, "PUT");
    if (!res.ok) {
      toast({ title: tc("saveErrorTitle"), description: tc(writeErrorKey(res.status)), tone: "error" });
      return;
    }
    toast({ title: t("configSaved"), description: tenants.find((x) => x.id === tid)?.name ?? tid, tone: "success" });
  }

  return (
    <div className="space-y-6">
      {/* IA / WhatsApp por tenant */}
      <div className="panel hairline p-6 space-y-4 max-w-2xl">
        <p className="eyebrow">{t("tenantConfig")}</p>
        <select className="input" value={tid} onChange={(e) => pick(e.target.value)}>
          {tenants.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-medium text-ink-2 mb-1.5">{ts("aiPersona")}</span>
            <input className="input" value={cfg.aiPersona ?? ""} placeholder="Vega" onChange={(e) => setCfg((c) => ({ ...c, aiPersona: e.target.value }))} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-ink-2 mb-1.5">{tc("adjust")}</span>
            <input className="input" value={cfg.aiTone ?? ""} onChange={(e) => setCfg((c) => ({ ...c, aiTone: e.target.value }))} />
          </label>
          <label className="block sm:col-span-2">
            <span className="block text-xs font-medium text-ink-2 mb-1.5">{ts("whatsapp")}</span>
            <input className="input mono" value={cfg.whatsapp ?? ""} placeholder="+55 11 9 …" inputMode="tel" onChange={(e) => setCfg((c) => ({ ...c, whatsapp: e.target.value }))} />
          </label>
        </div>
        <Button variant="primary" onClick={save}>{tc("save")}</Button>
      </div>

      {/* Matriz de permissões (derivada das tools — fonte da verdade do RBAC) */}
      <div className="panel hairline overflow-hidden">
        <div className="px-5 py-3 border-b border-line"><p className="eyebrow">{t("permissions")}</p></div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="eyebrow px-4 pl-5 py-3 font-normal">Tool</th>
                {ROLES_ORDER.map((r) => <th key={r} className="eyebrow px-3 py-3 font-normal text-center">{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-4 pl-5 py-2.5 mono text-xs text-ink-2">{row.id}</td>
                  {ROLES_ORDER.map((r) => (
                    <td key={r} className="px-3 py-2.5 text-center">
                      {row.roles[r] ? <Check size={14} className="inline text-positive" /> : <span className="text-ink-4">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── BILLING (0C §2.7) ────────────────────────────────────────────────────────
function Billing({ t, fmt, refresh, tenants }: { t: Tr; fmt: Fmt; refresh: () => void; tenants: Tenant[] }) {
  const { toast } = useToast();
  const tc = useTranslations("common");
  const invoices = listInvoices();
  const sum = billingSummary();

  async function pay(inv: Invoice) {
    markInvoicePaid(inv.id);
    refresh();
    const res = await writeJson(`/api/owner/billing/${inv.id}/pay`, {}, "POST");
    if (!res.ok) {
      toast({ title: tc("saveErrorTitle"), description: tc(writeErrorKey(res.status)), tone: "error" });
      return;
    }
    toast({ title: t("invoicePaid"), description: `${inv.tenantName} · ${inv.period}`, tone: "success" });
  }
  async function generate() {
    const tn = tenants.find((x) => x.status === "active") ?? tenants[0];
    if (!tn) return;
    const inv = generateInvoice(tn.id);
    refresh();
    const res = await writeJson("/api/owner/billing", { tenantId: tn.id }, "POST");
    if (!res.ok) {
      toast({ title: tc("saveErrorTitle"), description: tc(writeErrorKey(res.status)), tone: "error" });
      return;
    }
    if (inv) toast({ title: t("invoiceGenerated"), description: `${inv.tenantName} · ${inv.period}`, tone: "success" });
  }
  const tone = (s: Invoice["status"]) => (s === "paid" ? "positive" : s === "past_due" ? "danger" : "warning");

  return (
    <div className="space-y-4">
      <StatTiles cols={3}>
        <StatTile label={t("mrr")} value={fmt.moneyCompact(sum.mrr)} accent="gold" />
        <StatTile label={t("outstanding")} value={fmt.moneyCompact(sum.outstanding)} accent="danger" />
        <StatTile label={t("collected")} value={fmt.moneyCompact(sum.collected)} accent="positive" />
      </StatTiles>
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={generate}><Plus size={14} />{t("generateInvoice")}</Button>
      </div>
      <div className="panel hairline overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                {[t("tenants"), t("period"), t("amount"), t("system"), ""].map((h, i) => (
                  <th key={i} className={cn("eyebrow px-4 py-3 font-normal", i > 1 && "text-right", i === 0 && "pl-5")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-line last:border-0 hover:bg-surface-2/60 transition-colors">
                  <td className="px-4 pl-5 py-3 text-ink font-medium">{inv.tenantName}</td>
                  <td className="px-4 py-3 mono text-ink-3">{inv.period}</td>
                  <td className="px-4 py-3 text-right tnum text-ink-2">{fmt.money(inv.amount)}</td>
                  <td className="px-4 py-3 text-right"><Chip tone={tone(inv.status)}>{t(`invoiceStatus.${inv.status}`)}</Chip></td>
                  <td className="px-4 pr-5 py-3 text-right">
                    {inv.status !== "paid" && (
                      <Button variant="ghost" size="sm" onClick={() => pay(inv)}>{t("markPaid")}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── LANDING CMS (0C §2.5) ────────────────────────────────────────────────────
function LandingCms({ t }: { t: Tr }) {
  const { toast } = useToast();
  const tc = useTranslations("common");
  const [loc, setLoc] = useState<Locale>(locales[0]);
  const [vals, setVals] = useState<Record<string, string>>(() => ({ ...getLandingContent(locales[0]) }));

  function pick(l: Locale) {
    setLoc(l);
    setVals({ ...getLandingContent(l) });
  }
  async function save() {
    updateLandingContent(loc, vals); // store client-side (a landing aplica o override)
    const res = await writeJson("/api/owner/landing", { locale: loc, ...vals }, "PUT");
    if (!res.ok) {
      toast({ title: tc("saveErrorTitle"), description: tc(writeErrorKey(res.status)), tone: "error" });
      return;
    }
    toast({ title: t("landingSaved"), description: localeMeta[loc].native, tone: "success" });
  }

  return (
    <div className="panel hairline p-6 space-y-5 max-w-2xl">
      <div>
        <p className="eyebrow mb-1">{t("landing")}</p>
        <p className="text-sm text-ink-3 mb-3 text-pretty">{t("landingHint")}</p>
        <div className="flex flex-wrap gap-2">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => pick(l)}
              className={cn("chip", l === loc ? "text-brand border-[color:var(--border-gold)] bg-[var(--brand-soft)]" : "text-ink-3 border-line bg-surface-2 hover:text-ink-2")}
            >
              {localeMeta[l].native}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {LANDING_FIELDS.map((f) => (
          <div key={f}>
            <label className="block text-xs font-medium text-ink-2 mb-1.5 mono">{f}</label>
            <input
              className="input"
              value={vals[f] ?? ""}
              placeholder={t("landingHint")}
              onChange={(e) => setVals((v) => ({ ...v, [f]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <Button variant="primary" onClick={save}>{t("landingSave")}</Button>
    </div>
  );
}

// ── FLAGS ────────────────────────────────────────────────────────────────────
function Flags({ rows, t }: { rows: FeatureFlag[]; t: Tr }) {
  // Estado compartilhado: alternar aqui some/aparece o módulo no rail e no
  // command palette na hora (0D §9c — módulos condicionados por flag).
  const { enabled, toggle } = useFlags();

  const scopeLabel = (scope: FeatureFlag["scope"]) =>
    scope === "global" ? t("global") : scope === "plan" ? t("perPlan") : t("perTenant");
  const scopeTone = (scope: FeatureFlag["scope"]) =>
    scope === "global" ? "gold" : scope === "plan" ? "info" : "neutral";

  return (
    <div className="panel hairline overflow-hidden">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[680px] text-sm border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th className="eyebrow px-4 pl-5 py-3 text-left font-medium">{t("module")}</th>
              <th className="eyebrow px-4 py-3 text-left font-medium">{t("system")}</th>
              <th className="eyebrow px-4 py-3 text-center font-medium w-px whitespace-nowrap">{t("state")}</th>
              <th className="eyebrow px-4 pr-5 py-3 text-left font-medium">{t("rollout")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => {
              const on = enabled[f.module] ?? f.enabled;
              return (
                <tr key={f.module} className="border-b border-line last:border-0 hover:bg-surface-2/60 transition-colors">
                  <td className="px-4 pl-5 py-3.5">
                    <p className="text-ink font-medium">{f.label}</p>
                    <p className="mono text-[0.7rem] text-ink-4">{f.module}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <Chip tone={scopeTone(f.scope)}>{scopeLabel(f.scope)}</Chip>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-center">
                      <Switch on={on} onClick={() => toggle(f.module)} />
                    </div>
                  </td>
                  <td className="px-4 pr-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <Meter value={f.rollout / 100} tone={on ? "gold" : "neutral"} className="flex-1" />
                      <span className={cn("mono tnum text-xs w-10 text-right", on ? "text-ink-2" : "text-ink-4")}>{f.rollout}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Visual toggle switch — rounded-full track, gold when on.
function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-[22px] w-[40px] items-center rounded-full border transition-colors duration-200 ease-[var(--ease-out-expo)] shrink-0",
        on
          ? "bg-[var(--brand-soft)] border-line-gold"
          : "bg-surface-4 border-line hover:border-line-strong",
      )}
    >
      <span
        className={cn(
          "absolute size-[16px] rounded-full transition-all duration-200 ease-[var(--ease-out-expo)]",
          on
            ? "left-[20px] bg-brand shadow-[0_0_10px_-1px_rgba(202,138,4,0.7)]"
            : "left-[2px] bg-ink-4",
        )}
      />
    </button>
  );
}

// ── USERS (0C §2.3) — lista global de usuários, via /api/owner/users ───────────
type OwnerUser = { id: string; email: string; name: string; role: string; orgId: string; blocked: boolean };
const ALL_ROLES = ["viewer", "member", "tributarista", "manager", "org_admin", "platform_support", "platform_staff", "platform_owner"];
const ROLE_TONE: Record<string, "gold" | "info" | "neutral"> = {
  platform_owner: "gold", platform_staff: "gold", platform_support: "info",
  org_admin: "info", manager: "info", tributarista: "info",
  member: "neutral", viewer: "neutral",
};
const BLANK_FORM = { name: "", email: "", role: "member", orgId: "org-acme" };

function UsersTab({ t }: { t: Tr }) {
  const ts = useTranslations("settings");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const [rows, setRows] = useState<OwnerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/owner/users")
      .then((r) => r.json())
      .then((j) => { setRows(Array.isArray(j?.data) ? j.data : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setSaving(true);
    const res = await fetch("/api/owner/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then((r) => r.json()).catch(() => ({ error: true }));
    setSaving(false);
    if (res?.data?.id) {
      toast({ title: t("userCreated"), description: form.email, tone: "success" });
      setShowCreate(false);
      setForm(BLANK_FORM);
      load();
    } else {
      toast({ title: tc("saveErrorTitle"), description: res?.error?.code ?? "Erro", tone: "error" });
    }
  }

  async function patchUser(u: OwnerUser, patch: { role?: string; blocked?: boolean }) {
    const res = await fetch(`/api/owner/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => r.json()).catch(() => ({ error: true }));
    if (res?.data?.id) {
      setRows((prev) => prev.map((x) => x.id === u.id ? { ...x, ...patch } : x));
      toast({ title: u.name, description: patch.blocked ? t("userBlocked") : patch.role ?? t("roleUpdated"), tone: patch.blocked ? "warning" : "success" });
    } else {
      toast({ title: tc("saveErrorTitle"), tone: "error" });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setShowCreate((v) => !v)}>
          <UserPlus size={14} />{t("newUser")}
        </Button>
      </div>
      {showCreate && (
        <div className="panel hairline p-5 space-y-3 max-w-2xl">
          <p className="eyebrow">{t("newUser")}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-ink-2 mb-1 block">{ts("memberName")}</span>
              <input className="input" placeholder="João Silva" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-2 mb-1 block">{ts("memberEmail")}</span>
              <input className="input" type="email" placeholder="joao@empresa.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-2 mb-1 block">{ts("role")}</span>
              <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-2 mb-1 block">{t("org")}</span>
              <input className="input" value={form.orgId} onChange={(e) => setForm((f) => ({ ...f, orgId: e.target.value }))} />
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={create} disabled={saving}>{saving ? <Loader2 size={13} className="animate-spin" /> : null}{tc("save")}</Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setForm(BLANK_FORM); }}>{tc("cancel")}</Button>
          </div>
        </div>
      )}
      <div className="panel hairline overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="eyebrow px-4 pl-5 py-3 font-normal">{ts("memberName")}</th>
                <th className="eyebrow px-4 py-3 font-normal">{ts("memberEmail")}</th>
                <th className="eyebrow px-4 py-3 font-normal">{ts("role")}</th>
                <th className="eyebrow px-4 py-3 font-normal text-right">{t("org")}</th>
                <th className="eyebrow px-4 pr-5 py-3 font-normal text-right">{t("system")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className={cn("border-b border-line last:border-0 hover:bg-surface-2/60 transition-colors", u.blocked && "opacity-50")}>
                  <td className="px-4 pl-5 py-3.5 text-ink font-medium">{u.name}</td>
                  <td className="px-4 py-3.5 mono text-xs text-ink-3">{u.email}</td>
                  <td className="px-4 py-3.5">
                    <select
                      className="chip text-[0.72rem] bg-transparent border-none cursor-pointer"
                      value={u.role}
                      onChange={(e) => patchUser(u, { role: e.target.value })}
                      aria-label={ts("role")}
                    >
                      {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3.5 text-right mono text-xs text-ink-4">{u.orgId}</td>
                  <td className="px-4 pr-5 py-3.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => patchUser(u, { blocked: !u.blocked })}>
                      {u.blocked ? <Unlock size={13} className="text-positive" /> : <Lock size={13} className="text-ink-3" />}
                    </Button>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-4"><Loader2 size={16} className="inline animate-spin" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── AI & AGENTE (0A) — connectors + jobs + pipeline de treino, agora com UI ─────
type ConnectorRow = { id: string; label: string; capabilities: string[]; status: string };
type TrainingRow = { snapshot: { total: number; approvalRate: number }; curated: number; evalScore: number; version: string; status: string };
function AiPanel({ t, fmt }: { t: Tr; fmt: Fmt }) {
  const { toast } = useToast();
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [training, setTraining] = useState<TrainingRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch("/api/ai/connectors").then((r) => r.json()).then((j) => setConnectors(Array.isArray(j?.data) ? j.data : [])).catch(() => {});
    fetch("/api/ai/training").then((r) => r.json()).then((j) => setTraining(j?.data ?? null)).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  async function sync(id: string) {
    setBusy(id);
    const res = await writeJson(`/api/ai/connectors/${id}/sync`, {}, "POST");
    setBusy(null);
    if (res.ok && res.data) {
      const d = res.data as { ingested: number; source: string };
      toast({ title: t("aiPanel.sync"), description: t("aiPanel.syncedToast", { n: String(d.ingested), source: d.source }), tone: "success" });
      load();
    } else toast({ title: t("aiPanel.error"), tone: "error" });
  }
  async function runJobs() {
    setBusy("jobs");
    const res = await writeJson("/api/ai/jobs/run", {}, "POST");
    setBusy(null);
    if (res.ok && res.data) {
      const d = res.data as { synced: number; ingested: number; recommendations: number };
      toast({ title: t("aiPanel.runJobs"), description: t("aiPanel.jobsToast", { synced: String(d.synced), ingested: String(d.ingested), recs: String(d.recommendations) }), tone: "success" });
      load();
    } else toast({ title: t("aiPanel.error"), tone: "error" });
  }

  const trainStatusKey = training?.status === "evaluated" ? "statusEvaluated" : training?.status === "ready_to_train" ? "statusReady" : "statusCollecting";

  return (
    <div className="space-y-6">
      {/* Connectors + jobs */}
      <div className="panel hairline overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line">
          <span className="inline-flex items-center gap-2 eyebrow"><Plug size={13} className="text-brand" /> {t("aiPanel.connectors")}</span>
          <Button variant="secondary" size="sm" onClick={runJobs} disabled={busy === "jobs"}>
            {busy === "jobs" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {t("aiPanel.runJobs")}
          </Button>
        </div>
        <ul>
          {connectors.map((c, i) => (
            <li key={c.id} className={cn("flex flex-wrap items-center gap-3 px-5 py-3.5", i > 0 && "border-t border-line")}>
              <span className="grid place-items-center size-9 rounded-[var(--radius-md)] border border-line bg-surface-2 text-brand shrink-0"><Plug size={15} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-ink font-medium">{c.label}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {c.capabilities.map((cap) => <Chip key={cap} tone="neutral">{cap === "read" ? t("aiPanel.read") : t("aiPanel.write")}</Chip>)}
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 mono text-xs text-positive"><span className="size-1.5 rounded-full bg-positive" /> {c.status}</span>
              {c.capabilities.includes("read") && (
                <Button variant="ghost" size="sm" onClick={() => sync(c.id)} disabled={busy === c.id}>
                  {busy === c.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  {t("aiPanel.sync")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Pipeline de treino */}
      {training && (
        <div className="panel hairline p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <span className="inline-flex items-center gap-2 eyebrow"><Bot size={13} className="text-brand" /> {t("aiPanel.training")}</span>
            <Chip tone={training.status === "evaluated" ? "positive" : training.status === "ready_to_train" ? "gold" : "neutral"}>{t(`aiPanel.${trainStatusKey}`)}</Chip>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <Metric label={t("aiPanel.feedback")} value={fmt.number(training.snapshot.total)} />
            <Metric label={t("aiPanel.approval")} value={fmt.percent(training.snapshot.approvalRate)} />
            <Metric label={t("aiPanel.curated")} value={fmt.number(training.curated)} />
            <Metric label={t("aiPanel.evalScore")} value={fmt.percent(training.evalScore)} />
          </div>
          <div className="mt-5 pt-4 border-t border-line flex items-center justify-between gap-3">
            <span className="text-sm text-ink-3">{t("aiPanel.version")}</span>
            <span className="mono text-sm text-brand">{training.version}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow mb-1.5">{label}</p>
      <p className="font-display font-semibold text-xl text-ink tnum leading-none">{value}</p>
    </div>
  );
}

// ── AUDIT ────────────────────────────────────────────────────────────────────
function Audit({ rows, t, fmt }: { rows: ReturnType<typeof ownerAudit>; t: Tr; fmt: Fmt }) {
  return (
    <div>
      <div className="panel hairline overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line bg-surface-2">
          <span className="inline-flex items-center gap-2 mono text-[0.72rem] uppercase tracking-[0.14em] text-ink-3">
            <ScrollText size={13} className="text-brand" />
            {t("audit")}
          </span>
          <span className="inline-flex items-center gap-1.5 mono text-[0.7rem] text-ink-4">
            <ShieldCheck size={12} className="text-positive" />
            {t("immutableTrail")}
          </span>
        </div>
        <div className="divide-y divide-line">
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[auto_1fr] sm:grid-cols-[140px_1fr] gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-surface-2/50 transition-colors">
              <time className="mono text-xs text-ink-4 tnum pt-0.5">
                {fmt.date(row.at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </time>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="mono text-sm text-brand">{row.actor}</span>
                  <Chip tone="neutral">{row.tenant}</Chip>
                  <span className="text-sm text-ink">{row.action}</span>
                </div>
                <p className="mt-0.5 text-sm text-ink-3 text-pretty">{row.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-4 inline-flex items-center gap-1.5">
        <ShieldCheck size={12} className="text-ink-4" />
        {t("auditNote")}
      </p>
    </div>
  );
}

// ── SYSTEM (função 12 / 0C §2.11) — configurações globais da plataforma ─────────
function SystemSection({ t }: { t: Tr }) {
  const { toast } = useToast();
  const tc = useTranslations("common");
  const [cfg, setCfg] = useState<SystemSettings>(() => getSystemSettings());
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    updateSystemSettings(cfg); // store in-memory (otimista)
    const res = await fetch("/api/owner/system", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    }).then((r) => r.json()).catch(() => ({ error: true }));
    setSaving(false);
    if (res?.data) {
      toast({ title: t("systemSaved"), tone: "success" });
    } else {
      toast({ title: tc("saveErrorTitle"), tone: "error" });
    }
  }

  const ALL_LOCALES = ["pt-BR", "en", "zh-CN", "fr-FR"];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Identidade da plataforma */}
      <div className="panel hairline p-6 space-y-4">
        <p className="eyebrow">{t("systemIdentity")}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-medium text-ink-2 mb-1.5">{t("systemName")}</span>
            <input className="input" value={cfg.platformName} onChange={(e) => setCfg((c) => ({ ...c, platformName: e.target.value }))} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-ink-2 mb-1.5">{t("systemSupportEmail")}</span>
            <input className="input" type="email" value={cfg.supportEmail} onChange={(e) => setCfg((c) => ({ ...c, supportEmail: e.target.value }))} />
          </label>
        </div>
      </div>

      {/* Idiomas */}
      <div className="panel hairline p-6 space-y-4">
        <p className="eyebrow">{t("systemLocales")}</p>
        <div>
          <p className="text-xs text-ink-4 mb-2">{t("systemDefaultLocale")}</p>
          <select className="input" value={cfg.defaultLocale} onChange={(e) => setCfg((c) => ({ ...c, defaultLocale: e.target.value }))}>
            {ALL_LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <p className="text-xs text-ink-4 mb-2">{t("systemActiveLocales")}</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_LOCALES.map((l) => {
              const on = cfg.activeLocales.includes(l);
              return (
                <button
                  key={l}
                  aria-pressed={on}
                  onClick={() => setCfg((c) => ({
                    ...c,
                    activeLocales: on ? c.activeLocales.filter((x) => x !== l) : [...c.activeLocales, l],
                  }))}
                  className={cn("chip mono text-[0.7rem] transition-colors", on ? "text-brand border-[color:var(--border-gold)] bg-[var(--brand-soft)]" : "text-ink-4 border-line bg-surface-2 hover:text-ink-2")}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Segurança */}
      <div className="panel hairline p-6 space-y-4">
        <p className="eyebrow">{t("systemSecurity")}</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-ink">{t("systemStrongPassword")}</p>
              <p className="text-xs text-ink-4">{t("systemStrongPasswordHint")}</p>
            </div>
            <Switch on={cfg.enforceStrongPassword} onClick={() => setCfg((c) => ({ ...c, enforceStrongPassword: !c.enforceStrongPassword }))} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-ink">{t("systemMfa")}</p>
              <p className="text-xs text-ink-4">{t("systemMfaHint")}</p>
            </div>
            <Switch on={cfg.mfaEnabled} onClick={() => setCfg((c) => ({ ...c, mfaEnabled: !c.mfaEnabled }))} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-ink">{t("systemMaintenance")}</p>
              <p className="text-xs text-ink-4">{t("systemMaintenanceHint")}</p>
            </div>
            <Switch on={cfg.maintenanceMode} onClick={() => setCfg((c) => ({ ...c, maintenanceMode: !c.maintenanceMode }))} />
          </div>
          <label className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-ink">{t("systemSessionTtl")}</p>
              <p className="text-xs text-ink-4">{t("systemSessionTtlHint")}</p>
            </div>
            <input className="input w-20 text-right" type="number" min="1" max="168" value={cfg.sessionTtlHours} onChange={(e) => setCfg((c) => ({ ...c, sessionTtlHours: parseInt(e.target.value) || 8 }))} />
          </label>
        </div>
      </div>

      <Button variant="primary" onClick={save} disabled={saving}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : null}
        {tc("save")}
      </Button>
    </div>
  );
}
