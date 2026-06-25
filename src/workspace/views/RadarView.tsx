"use client";

import { useMemo, useState } from "react";
import { Radar, FileText, ArrowUpRight, ExternalLink, Dot } from "lucide-react";
import { listRadar, opportunityForNorm, type RadarItem } from "@/server/domain/store";
import { useFormatter, useTranslations } from "@/i18n/provider";
import { useWorkspace } from "@/workspace/store";
import { Chip, Meter, buttonClass } from "@/ui/primitives";
import { ViewScroll, ViewHeader } from "./shared";
import { cn } from "@/ui/cn";

type LevelFilter = "all" | "federal" | "state" | "municipal";

// Mapeia a esfera da norma → tom do chip (ouro é escasso: só o federal o usa).
const LEVEL_TONE = {
  federal: "gold",
  state: "info",
  municipal: "neutral",
} as const;

// Três baldes da timeline, na ordem em que aparecem.
const BUCKETS = ["today", "thisWeek", "earlier"] as const;
type BucketId = (typeof BUCKETS)[number];

function bucketOf(daysSince: number): BucketId {
  if (daysSince === 0) return "today";
  if (daysSince <= 7) return "thisWeek";
  return "earlier";
}

export function RadarView() {
  const t = useTranslations("radar");
  const tc = useTranslations("common");
  const fmt = useFormatter();
  const ws = useWorkspace();

  const [level, setLevel] = useState<LevelFilter>("all");

  const items = useMemo(() => listRadar({ level }), [level]);

  // Agrupa reativamente nos três baldes, preservando a ordenação por recência.
  const groups = useMemo(() => {
    const map: Record<BucketId, RadarItem[]> = { today: [], thisWeek: [], earlier: [] };
    for (const item of items) map[bucketOf(item.daysSince)].push(item);
    return map;
  }, [items]);

  const filters: { id: LevelFilter; label: string }[] = [
    { id: "all", label: t("allLevels") },
    { id: "federal", label: t("federal") },
    { id: "state", label: t("state") },
    { id: "municipal", label: t("municipal") },
  ];

  const matchedCount = useMemo(() => items.filter((n) => n.matched).length, [items]);

  return (
    <ViewScroll>
      <ViewHeader
        icon={<Radar size={20} />}
        eyebrow={tc("updatedAt") + " · " + fmt.date(new Date(), { day: "2-digit", month: "long" })}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      {/* barra de filtros por esfera + leitura de contexto */}
      <div className="flex flex-wrap items-center gap-3 mb-7">
        <div className="inline-flex items-center gap-1 p-1 rounded-[var(--radius-md)] border border-line bg-surface-2">
          <Radar size={14} className="text-ink-4 ml-1.5 mr-0.5" />
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setLevel(f.id)}
              aria-pressed={level === f.id}
              className={cn(
                "px-3 h-8 rounded-[var(--radius-sm)] text-sm transition-colors whitespace-nowrap",
                level === f.id ? "bg-surface-4 text-ink" : "text-ink-3 hover:text-ink",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="ml-auto inline-flex items-center gap-2 mono text-xs text-ink-4 tnum">
          <span>{fmt.number(items.length)} {t("title").toLowerCase()}</span>
          {matchedCount > 0 && (
            <>
              <Dot size={12} className="text-ink-4 -mx-1" />
              <span className="text-positive">{fmt.number(matchedCount)} {t("matched").toLowerCase()}</span>
            </>
          )}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="panel hairline">
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="mb-5 grid place-items-center size-16 rounded-full border border-line bg-surface-2 text-brand">
              <Radar size={22} />
            </div>
            <h3 className="text-lg font-semibold text-ink">{t("feedEmpty")}</h3>
          </div>
        </div>
      ) : (
        <div className="space-y-9">
          {BUCKETS.map((bucket) => {
            const rows = groups[bucket];
            if (rows.length === 0) return null; // pula balde vazio
            return (
              <section key={bucket}>
                {/* cabeçalho do balde da timeline */}
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="eyebrow !text-brand">{t(bucket)}</h2>
                  <span className="mono text-xs text-ink-4 tnum">{fmt.number(rows.length)}</span>
                  <span className="h-px flex-1 bg-line" />
                </div>

                {/* hairline vertical + nós */}
                <ol className="relative pl-6 sm:pl-7">
                  <span
                    aria-hidden
                    className="absolute left-[7px] sm:left-[9px] top-1.5 bottom-1.5 w-px bg-line"
                  />
                  {rows.map((norm) => (
                    <RadarRow key={norm.id} norm={norm} fmt={fmt} t={t} tc={tc} onOpen={ws.open} />
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </ViewScroll>
  );
}

function RadarRow({
  norm,
  fmt,
  t,
  tc,
  onOpen,
}: {
  norm: RadarItem;
  fmt: ReturnType<typeof useFormatter>;
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
  onOpen: ReturnType<typeof useWorkspace>["open"];
}) {
  const opp = opportunityForNorm(norm.id);
  const tone = LEVEL_TONE[norm.level];

  return (
    <li className="relative pb-5 last:pb-0">
      {/* nó dourado na trilha */}
      <span
        aria-hidden
        className="absolute -left-6 sm:-left-7 top-[1.35rem] grid place-items-center"
      >
        <span className="size-[7px] rounded-full bg-brand shadow-[0_0_0_4px_var(--brand-glow)]" />
      </span>

      <article className="group panel hairline px-4 py-3.5 sm:px-5 sm:py-4 transition-colors hover:border-line-strong">
        {/* topo: esfera + jurisdição + referência da fonte + data */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <Chip tone={tone}>{t(norm.level)}</Chip>
          <span className="text-xs text-ink-3">{norm.jurisdiction}</span>
          <Dot size={12} className="text-ink-4 -mx-1 shrink-0" />
          <span className="mono text-xs text-brand truncate max-w-[60%]" title={norm.source.ref}>
            {norm.source.ref}
          </span>
          <span className="ml-auto mono text-xs text-ink-4 tnum whitespace-nowrap">
            {fmt.date(norm.publishedAt)}
          </span>
        </div>

        {/* corpo: título + resumo */}
        <h3 className="mt-2.5 font-display font-semibold text-[0.975rem] text-ink leading-snug text-pretty">
          {norm.title}
        </h3>
        <p className="mt-1 text-sm text-ink-3 line-clamp-2 text-pretty">{norm.summary}</p>

        {/* rodapé: relevância (meter) + sinais + ações */}
        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex items-center gap-2.5 min-w-[10rem]">
            <span className="eyebrow shrink-0">{t("relevance")}</span>
            <Meter value={norm.relevance} tone="gold" className="w-20 sm:w-28" />
            <span className="mono text-xs text-ink-2 tnum tabular-nums">{fmt.percent(norm.relevance)}</span>
          </div>

          {norm.matched && (
            <Chip tone="positive" className="shrink-0">{t("matched")}</Chip>
          )}

          <div className="ml-auto flex items-center gap-2">
            {norm.source.url && (
              <a
                href={norm.source.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonClass("ghost", "sm"),
                  "text-ink-3 hover:text-ink",
                )}
              >
                <ExternalLink size={13} />
                <span className="hidden sm:inline">{tc("source")}</span>
              </a>
            )}

            {opp ? (
              <button
                onClick={() => onOpen("opportunity", { id: opp.id })}
                className={buttonClass("outline", "sm")}
              >
                <FileText size={13} />
                {t("openAsOpportunity")}
                <ArrowUpRight size={13} className="-mr-0.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <span className="mono text-xs text-ink-4 select-none px-1" aria-hidden>—</span>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}
