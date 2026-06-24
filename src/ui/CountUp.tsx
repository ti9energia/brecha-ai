"use client";

import { useEffect, useRef, useState } from "react";
import { useFormatter } from "@/i18n/provider";

type Kind = "money" | "moneyCompact" | "number" | "percent" | "integer";

function useFormat(kind: Kind, currency?: string) {
  const fmt = useFormatter();
  return (n: number) => {
    switch (kind) {
      case "money": return fmt.money(n, currency);
      case "moneyCompact": return fmt.moneyCompact(n, currency);
      case "percent": return fmt.percent(n);
      case "integer": return fmt.number(Math.round(n));
      default: return fmt.number(n);
    }
  };
}

// Conta de `from` até `value` quando entra em vista.
export function CountUp({
  value,
  from = 0,
  duration = 1400,
  kind = "number",
  currency,
  className,
}: {
  value: number;
  from?: number;
  duration?: number;
  kind?: Kind;
  currency?: string;
  className?: string;
}) {
  const format = useFormat(kind, currency);
  const [n, setN] = useState(from);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (t: number) => {
            const p = Math.min(1, (t - start) / duration);
            const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
            setN(from + (value - from) * eased);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, from, duration]);

  return (
    <span ref={ref} className={className}>
      {format(n)}
    </span>
  );
}

// Ticker que sobe continuamente (landing: "dinheiro deixado na mesa").
export function LiveTicker({
  base,
  perSecond,
  kind = "money",
  currency,
  className,
}: {
  base: number;
  perSecond: number;
  kind?: Kind;
  currency?: string;
  className?: string;
}) {
  const format = useFormat(kind, currency);
  const [n, setN] = useState(base);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      setN(base + (perSecond * (t - start)) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [base, perSecond]);
  return <span className={className}>{format(n)}</span>;
}
