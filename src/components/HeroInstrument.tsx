"use client";

import { useState } from "react";
import { Radar } from "lucide-react";
import { useFormatter, useTranslations } from "@/i18n/provider";
import { ApertureRing } from "@/ui/ApertureRing";
import { cn } from "@/ui/cn";

export interface HeroOpp {
  id: string;
  title: string;
  estimatedGain: number;
  daysRemaining: number;
  sector: string;
}

export function HeroInstrument({ opps, sources }: { opps: HeroOpp[]; sources: number }) {
  const fmt = useFormatter();
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const top = opps[0];
  const [active, setActive] = useState(0);
  const focused = opps[active] ?? top;

  // posições determinísticas dos blips (sem random no render)
  const blips = opps.slice(0, 5).map((o, i) => {
    const angle = (-58 + i * 67) * (Math.PI / 180);
    const radius = 30 + (i % 3) * 8; // % do raio
    return {
      ...o,
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle),
      i,
    };
  });

  const maxWindow = 120;
  const ringValue = Math.min(1, Math.max(0.05, focused.daysRemaining / maxWindow));

  return (
    <div className="relative w-full max-w-[34rem] mx-auto">
      {/* anel de vidro externo */}
      <div className="relative aspect-square rounded-full panel hairline overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40" />
        {/* anéis de alcance */}
        <svg className="absolute inset-0 size-full text-line" viewBox="0 0 100 100" fill="none">
          {[44, 33, 22, 11].map((r) => (
            <circle key={r} cx="50" cy="50" r={r} stroke="currentColor" strokeWidth="0.2" />
          ))}
          <line x1="50" y1="6" x2="50" y2="94" stroke="currentColor" strokeWidth="0.15" />
          <line x1="6" y1="50" x2="94" y2="50" stroke="currentColor" strokeWidth="0.15" />
        </svg>

        {/* varredura do radar */}
        <div
          className="absolute inset-0 rounded-full opacity-70"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, var(--brand-soft) 350deg, var(--brand-glow) 360deg)",
            animation: "spin 7s linear infinite",
            WebkitMaskImage: "radial-gradient(circle, #000 70%, transparent 71%)",
            maskImage: "radial-gradient(circle, #000 70%, transparent 71%)",
          }}
        />

        {/* blips */}
        {blips.map((b) => (
          <button
            key={b.id}
            onMouseEnter={() => setActive(b.i)}
            onFocus={() => setActive(b.i)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
            aria-label={b.title}
          >
            <span className="relative grid place-items-center">
              <span
                className={cn(
                  "absolute size-7 rounded-full",
                  b.i === active ? "bg-[var(--brand-glow)]" : "bg-transparent",
                )}
              />
              <span className="size-2.5 rounded-full bg-brand shadow-[0_0_10px_var(--brand)] animate-[pulse-ring_3s_ease-out_infinite]" />
              <span
                className={cn(
                  "absolute left-4 whitespace-nowrap rounded-full border border-line-gold bg-[color:var(--surface)]/90 px-2 py-0.5 mono text-[0.62rem] text-brand transition-opacity",
                  b.i === active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              >
                {fmt.moneyCompact(b.estimatedGain)}
              </span>
            </span>
          </button>
        ))}

        {/* centro: a Abertura */}
        <div className="absolute inset-0 grid place-items-center">
          <ApertureRing
            value={ringValue}
            size={168}
            stroke={7}
            center={
              <span className="block">
                <span className="block text-3xl font-bold text-ink tnum leading-none">{focused.daysRemaining}</span>
              </span>
            }
            label={tc("days")}
          />
        </div>
      </div>

      {/* leitura inferior */}
      <div className="mt-5 flex items-center justify-between gap-3 rounded-[var(--radius-lg)] panel hairline px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative grid place-items-center size-7 rounded-full bg-[var(--positive-soft)] text-positive shrink-0">
            <Radar size={14} />
            <span className="absolute inset-0 rounded-full border border-[color:var(--positive)]/40 animate-[pulse-ring_2.6s_ease-out_infinite]" />
          </span>
          <div className="min-w-0">
            <p className="mono text-[0.66rem] text-ink-3 uppercase tracking-wider">{ts("radarActive")} · {fmt.number(sources)} {ts("sourcesLabel")}</p>
            <p className="text-sm text-ink truncate">{focused.title}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display font-semibold text-brand tnum leading-none">{fmt.moneyCompact(focused.estimatedGain)}</p>
          <p className="mono text-[0.62rem] text-ink-4">{tc("perYear")}</p>
        </div>
      </div>
    </div>
  );
}
