"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "./cn";

// O anel "Abertura": uma janela regulatória que se fecha conforme o prazo escorre.
// `value` 0..1 = fração de janela restante. A cor migra de ouro → âmbar → rosa.
export function ApertureRing({
  value,
  size = 112,
  stroke = 6,
  center,
  label,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  center?: React.ReactNode;
  label?: string;
  className?: string;
}) {
  const v = Math.min(1, Math.max(0, value));
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const gap = 0.16; // fenda permanente (a brecha) no topo
  const arc = c * (1 - gap);
  const filled = arc * v;

  const ref = useRef<SVGCircleElement>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const color =
    v > 0.5 ? "var(--brand-bright)" : v > 0.22 ? "var(--warning)" : "var(--danger)";

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-[calc(90deg+29deg)]">
        {/* trilho */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-4)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
        />
        {/* arco preenchido */}
        <circle
          ref={ref}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          strokeDashoffset={drawn ? 0 : filled}
          style={{
            transition: "stroke-dashoffset 1.1s var(--ease-out-expo), stroke 0.6s ease",
            filter: `drop-shadow(0 0 6px ${color})`,
            opacity: 0.95,
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display leading-none">{center}</div>
          {label && <div className="mt-1 text-[0.6rem] uppercase tracking-[0.2em] text-ink-3">{label}</div>}
        </div>
      </div>
    </div>
  );
}
