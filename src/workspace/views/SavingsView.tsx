"use client";

import { useState, useEffect, useMemo } from "react";
import { Coins, TrendingUp, Receipt, BadgeCheck, Clock, Wallet, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import type { SavingsRecord, SavingsSummary } from "@/lib/api/types";
import { useFormatter, useTranslations } from "@/i18n/provider";
import { useToast } from "@/ui/Toast";
import { CountUp } from "@/ui/CountUp";
import { Chip, Button } from "@/ui/primitives";
import { ViewScroll, ViewHeader, StatTiles, StatTile, Section, UpdatedAt, writeJson, writeErrorKey } from "./shared";
import { cn } from "@/ui/cn";

export function SavingsView() {
  const t = useTranslations("savings");
  const tTypes = useTranslations("oppTypes");
  const tc = useTranslations("common");
  const fmt = useFormatter();
  const { toast } = useToast();
  const [s, setS] = useState<SavingsSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Onda 6: store.ts server-only → carga via API.
  function load() {
    api.savings.get().then(setS).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  // Conciliação server-confirmed (08 §7): só reflete no estado local DEPOIS que o
  // servidor aceitar (manager+). Em 403/429/erro, nada muda e o usuário é avisado.
  async function reconcile(r: SavingsRecord) {
    setBusyId(r.id);
    const res = await writeJson("/api/savings/reconcile", { id: r.id }, "POST");
    setBusyId(null);
    if (!res.ok) {
      toast({ title: tc("saveErrorTitle"), description: tc(writeErrorKey(res.status)), tone: "error" });
      return;
    }
    // Recarrega do servidor para refletir o estado real após conciliação.
    load();
    toast({ title: t("reconciledToast"), description: r.playTitle, tone: "success" });
  }

  if (!s) return null; // carregando

  return (
    <ViewScroll>
      <ViewHeader
        icon={<Coins size={20} />}
        eyebrow={<UpdatedAt />}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <StatTiles>
        <StatTile
          label={t("realizedYtd")}
          value={<CountUp value={s.realizedYtd} kind="money" currency={s.currency} />}
          accent="positive"
          hint={<span className="inline-flex items-center gap-1"><TrendingUp size={11} className="text-positive" />{tc("realized")}</span>}
        />
        <StatTile
          label={t("inExecution")}
          value={fmt.moneyCompact(s.inExecution, s.currency)}
          accent="gold"
          hint={<span className="inline-flex items-center gap-1"><Wallet size={11} />{tc("estimated")}</span>}
        />
        <StatTile
          label={t("projected")}
          value={fmt.moneyCompact(s.projected12m, s.currency)}
          accent="info"
          hint={tc("estimated") + " · 12m"}
        />
        <StatTile
          label={t("successFee")}
          value={fmt.money(s.feeDue, s.currency)}
          accent="gold"
          hint={<span className="inline-flex items-center gap-1"><Receipt size={11} />{fmt.percent(s.feeRate)} · {t("feeRate")}</span>}
        />
      </StatTiles>

      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        {/* esquerda: gráfico trimestral */}
        <Section title={t("byQuarter")} className="lg:col-span-2 mb-0">
          <div className="panel hairline p-5 sm:p-6">
            <QuarterChart data={s.byQuarter} fmt={fmt} currency={s.currency} labels={{ realized: tc("realized"), projected: tc("estimated"), aria: t("chartAria") }} />
          </div>
        </Section>

        {/* direita: a conta do success fee */}
        <Section title={t("successFee")} className="mb-0">
          <div className="panel hairline p-6 h-full flex flex-col">
            <FeeRow label={t("feeBase")} value={fmt.money(s.feeBase, s.currency)} />
            <FeeRow label={t("feeRate")} value={fmt.percent(s.feeRate)} accent />

            <div className="my-5 border-t border-line" />

            <p className="eyebrow mb-2 text-ink-4">{t("feeDue")}</p>
            <p className="font-display font-semibold text-[2.1rem] sm:text-[2.4rem] text-brand tnum leading-none">
              <CountUp value={s.feeDue} kind="money" currency={s.currency} />
            </p>

            <div className="mt-auto pt-6 flex items-start gap-2 text-xs text-ink-3 text-pretty">
              <BadgeCheck size={14} className="text-positive shrink-0 mt-px" />
              <span>{t("feeNote")}</span>
            </div>
          </div>
        </Section>
      </div>

      <Section title={t("byPlay")}>
        <div className="panel hairline overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left border-collapse">
              <thead>
                <tr className="bg-surface-2 border-b border-line">
                  <th className="eyebrow font-normal px-5 py-3">{t("capturedPlays")}</th>
                  <th className="eyebrow font-normal px-5 py-3">{tc("status")}</th>
                  <th className="eyebrow font-normal px-5 py-3 text-right">{t("realizedGain")}</th>
                  <th className="eyebrow font-normal px-5 py-3 text-right">{tc("deadline")}</th>
                  <th className="eyebrow font-normal px-5 py-3 text-right">{t("reconciled")}</th>
                </tr>
              </thead>
              <tbody>
                {s.records.map((r: SavingsRecord, i) => (
                  <tr
                    key={r.id}
                    className={cn("transition-colors hover:bg-surface-2/60", i > 0 && "border-t border-line")}
                  >
                    <td className="px-5 py-3.5 text-sm text-ink font-medium text-pretty">{r.playTitle}</td>
                    <td className="px-5 py-3.5">
                      <Chip tone="neutral">{tTypes(r.type)}</Chip>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm text-positive tnum whitespace-nowrap font-medium">
                      {fmt.money(r.realizedGain, s.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right mono text-xs text-ink-3 tnum whitespace-nowrap">{r.quarter}</td>
                    <td className="px-5 py-3.5 text-right">
                      {r.reconciled ? (
                        <Chip tone="positive"><BadgeCheck size={12} />{t("reconciled")}</Chip>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={() => reconcile(r)} disabled={busyId === r.id} aria-label={t("reconcileAction")}>
                          {busyId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
                          {t("reconcileAction")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </ViewScroll>
  );
}

// ── Linha da conta do fee ──────────────────────────────────────────────────────
function FeeRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-sm text-ink-3 text-pretty">{label}</span>
      <span className={cn("font-display tnum tabular-nums whitespace-nowrap", accent ? "text-brand text-lg" : "text-ink text-lg")}>
        {value}
      </span>
    </div>
  );
}

// ── Gráfico de barras trimestral (SVG manual, sem libs) ─────────────────────────
type QuarterDatum = { quarter: string; realized: number; projected: number };

function QuarterChart({
  data,
  fmt,
  currency,
  labels,
}: {
  data: QuarterDatum[];
  fmt: ReturnType<typeof useFormatter>;
  currency: string;
  labels: { realized: string; projected: string; aria: string };
}) {
  // Geometria do viewBox — coordenadas internas, escala via SVG (responsivo por CSS).
  const W = 720;
  const H = 280;
  const padL = 56; // espaço p/ rótulos do eixo y
  const padR = 12;
  const padT = 16;
  const padB = 34; // espaço p/ rótulos de trimestre
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const max = useMemo(() => Math.max(1, ...data.map((d) => Math.max(d.realized, d.projected))), [data]);
  // Topo "arredondado" da escala (passo agradável) p/ as gridlines respirarem.
  const niceMax = useMemo(() => niceCeil(max), [max]);

  const ticks = useMemo(() => [0, 0.25, 0.5, 0.75, 1].map((f) => f * niceMax), [niceMax]);

  const n = data.length;
  const slot = plotW / n; // largura por trimestre
  const barW = Math.min(26, slot * 0.3); // largura de cada barra
  const gap = barW * 0.34; // folga entre realizado e projetado
  const pairW = barW * 2 + gap;
  const y = (v: number) => padT + plotH - (v / niceMax) * plotH;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label={labels.aria}>
        <defs>
          {/* Gradiente da barra "realizado" — o ouro é o herói. */}
          <linearGradient id="savBarGold" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--brand-deep)" />
            <stop offset="55%" stopColor="var(--brand)" />
            <stop offset="100%" stopColor="var(--brand-bright)" />
          </linearGradient>
          {/* Hachura discreta p/ a barra "projetado" (silenciosa). */}
          <pattern id="savHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--surface-4)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--border-strong)" strokeWidth="1.2" />
          </pattern>
        </defs>

        {/* gridlines + rótulos do eixo y */}
        {ticks.map((v, i) => {
          const yy = y(v);
          return (
            <g key={i}>
              <line
                x1={padL}
                y1={yy}
                x2={W - padR}
                y2={yy}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray={i === 0 ? undefined : "2 4"}
                shapeRendering="crispEdges"
              />
              <text
                x={padL - 10}
                y={yy}
                textAnchor="end"
                dominantBaseline="middle"
                className="mono"
                fontSize="11"
                fill="var(--ink-4)"
              >
                {fmt.moneyCompact(v, currency)}
              </text>
            </g>
          );
        })}

        {/* barras por trimestre */}
        {data.map((d, i) => {
          const cx = padL + slot * i + slot / 2; // centro do slot
          const x0 = cx - pairW / 2; // início do par
          const rx = x0; // barra realizado
          const px = x0 + barW + gap; // barra projetado
          const yReal = y(d.realized);
          const yProj = y(d.projected);
          const baseY = padT + plotH;
          const hReal = Math.max(0, baseY - yReal);
          const hProj = Math.max(0, baseY - yProj);
          const radius = Math.min(4, barW / 2);

          return (
            <g key={d.quarter}>
              {/* projetado — silencioso, hachurado */}
              {d.projected > 0 && (
                <rect
                  x={px}
                  y={yProj}
                  width={barW}
                  height={hProj}
                  rx={radius}
                  fill="url(#savHatch)"
                  stroke="var(--border-strong)"
                  strokeWidth="1"
                  className="sav-bar"
                  style={{ ["--sav-h" as string]: `${hProj}px`, ["--sav-y" as string]: `${yProj}px`, transformOrigin: `${px}px ${baseY}px` }}
                />
              )}
              {/* realizado — ouro, o herói */}
              {d.realized > 0 && (
                <rect
                  x={rx}
                  y={yReal}
                  width={barW}
                  height={hReal}
                  rx={radius}
                  fill="url(#savBarGold)"
                  className="sav-bar"
                  style={{ transformOrigin: `${rx}px ${baseY}px`, animationDelay: `${i * 70}ms` }}
                />
              )}
              {/* rótulo do trimestre */}
              <text
                x={cx}
                y={H - 12}
                textAnchor="middle"
                className="mono"
                fontSize="11"
                fill="var(--ink-4)"
              >
                {d.quarter}
              </text>
            </g>
          );
        })}
      </svg>

      {/* legenda */}
      <div className="mt-4 flex items-center gap-5 text-xs text-ink-3">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-[2px]" style={{ background: "linear-gradient(180deg, var(--brand-bright), var(--brand-deep))" }} />
          {labels.realized}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-[2px] border border-line-strong" style={{ background: "var(--surface-4)" }} />
          {labels.projected}
        </span>
      </div>

      <style jsx>{`
        .sav-bar {
          animation: savGrow 0.7s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
        }
        @keyframes savGrow {
          from {
            transform: scaleY(0);
          }
          to {
            transform: scaleY(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .sav-bar {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

// Arredonda o topo da escala p/ um número "redondo" (1/2/2.5/5 × 10^k).
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * mag;
}
