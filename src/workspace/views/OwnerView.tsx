"use client";

import { useMemo, useState } from "react";
import {
  Crown, Building2, CreditCard, ToggleLeft, ScrollText, TrendingUp,
  Sparkles, ArrowUpRight, ShieldCheck,
} from "lucide-react";
import {
  ownerKpis, listTenants, getPlans, listFlags, ownerAudit,
} from "@/server/domain/store";
import type { Tenant, Plan, FeatureFlag } from "@/server/domain/types";
import { useFormatter, useTranslations } from "@/i18n/provider";
import { useToast } from "@/ui/Toast";
import { useSession } from "@/workspace/session";
import { ViewScroll, ViewHeader, StatTiles, StatTile } from "./shared";
import { SectorIcon } from "@/ui/SectorIcon";
import { Button, Chip, Meter } from "@/ui/primitives";
import { cn } from "@/ui/cn";

type Section = "overview" | "tenants" | "plans" | "flags" | "audit";

export function OwnerView() {
  const t = useTranslations("owner");
  const tc = useTranslations("common");
  const fmt = useFormatter();
  const user = useSession();
  const [section, setSection] = useState<Section>("overview");

  const k = useMemo(() => ownerKpis(), []);
  const tenants = useMemo(() => listTenants(), []);
  const plans = useMemo(() => getPlans(), []);
  const flags = useMemo(() => listFlags(), []);
  const audit = useMemo(() => ownerAudit(), []);

  const tabs: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: t("overview"), icon: <TrendingUp size={14} /> },
    { id: "tenants", label: t("tenants"), icon: <Building2 size={14} /> },
    { id: "plans", label: t("plans"), icon: <CreditCard size={14} /> },
    { id: "flags", label: t("flags"), icon: <ToggleLeft size={14} /> },
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
      {section === "tenants" && <Tenants rows={tenants} t={t} fmt={fmt} />}
      {section === "plans" && <Plans rows={plans} t={t} fmt={fmt} />}
      {section === "flags" && <Flags rows={flags} t={t} />}
      {section === "audit" && <Audit rows={audit} t={t} fmt={fmt} />}
    </ViewScroll>
  );
}

type Tr = ReturnType<typeof useTranslations>;
type Fmt = ReturnType<typeof useFormatter>;

// ── OVERVIEW ─────────────────────────────────────────────────────────────────
function Overview({ k, t, tc, fmt }: { k: ReturnType<typeof ownerKpis>; t: Tr; tc: Tr; fmt: Fmt }) {
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
function Tenants({ rows, t, fmt }: { rows: Tenant[]; t: Tr; fmt: Fmt }) {
  const { toast } = useToast();
  return (
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
                    <Button variant="ghost" size="sm" onClick={() => toast({ title: t("impersonateBanner", { tenant: tn.name }), description: `${tn.plan} · ${fmt.number(tn.users)} ${t("users").toLowerCase()}`, tone: "info" })}>
                      {t("impersonate")}
                    </Button>
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

// ── PLANS ────────────────────────────────────────────────────────────────────
function Plans({ rows, t, fmt }: { rows: Plan[]; t: Tr; fmt: Fmt }) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
      {rows.map((p) => (
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

          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="font-display font-bold text-2xl tnum text-ink">{fmt.money(p.price)}</span>
            <span className="text-sm text-ink-4">{t("perMonth")}</span>
          </div>
          {p.feeRate > 0 && (
            <p className="mt-1.5 inline-flex w-fit items-center gap-1 chip text-positive border-[color:var(--positive)]/25 bg-[var(--positive-soft)]">
              + {fmt.percent(p.feeRate)} {t("successFee")}
            </p>
          )}

          <div className="mt-5 pt-5 border-t border-line">
            <p className="eyebrow mb-2.5">{t("entitlements")}</p>
            <div className="flex flex-wrap gap-1.5">
              {p.entitlements.map((e) => (
                <span key={e} className="chip text-ink-2 border-line bg-surface-2 mono text-[0.68rem]">{e}</span>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-line">
            <p className="eyebrow mb-2.5">{t("quotas")}</p>
            <dl className="space-y-2 text-sm">
              <QuotaRow label={t("users")} value={p.quotas.users} />
              <QuotaRow label={t("jurisdictions")} value={p.quotas.jurisdictions} />
              <QuotaRow label={t("aiCredits")} value={p.quotas.aiCredits} />
            </dl>
          </div>
        </div>
      ))}
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

// ── FLAGS ────────────────────────────────────────────────────────────────────
function Flags({ rows, t }: { rows: FeatureFlag[]; t: Tr }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    () => Object.fromEntries(rows.map((f) => [f.module, f.enabled])),
  );

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
              const on = enabled[f.module];
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
                      <Switch on={on} onClick={() => setEnabled((s) => ({ ...s, [f.module]: !s[f.module] }))} />
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
