"use client";

import type { ReactNode } from "react";
import { cn } from "@/ui/cn";

// Container rolável padrão de cada módulo.
export function ViewScroll({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("h-full overflow-y-auto", className)}>
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-7 pb-24">{children}</div>
    </div>
  );
}

// Cabeçalho consistente de módulo.
export function ViewHeader({
  icon,
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <div className="flex items-center gap-3">
          {icon && (
            <span className="grid place-items-center size-10 rounded-[var(--radius-md)] border border-line bg-surface-2 text-brand shrink-0">
              {icon}
            </span>
          )}
          <h1 className="font-display font-bold text-2xl sm:text-[1.7rem] text-ink leading-tight text-balance">{title}</h1>
        </div>
        {subtitle && <p className="mt-2 text-ink-3 text-pretty max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// Grade de KPIs no topo do módulo.
export function StatTiles({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 }) {
  return (
    <div className={cn("grid gap-px bg-[color:var(--border)] rounded-[var(--radius-lg)] overflow-hidden border border-line mb-7", cols === 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3")}>
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "gold" | "positive" | "danger" | "info";
}) {
  const color =
    accent === "gold" ? "text-brand" :
    accent === "positive" ? "text-positive" :
    accent === "danger" ? "text-danger" :
    accent === "info" ? "text-info" : "text-ink";
  return (
    <div className="bg-surface p-5">
      <p className="eyebrow mb-2">{label}</p>
      <p className={cn("font-display font-semibold text-xl sm:text-2xl tnum leading-none", color)}>{value}</p>
      {hint && <p className="mt-1.5 text-xs text-ink-4">{hint}</p>}
    </div>
  );
}

// Seção com título dentro de um módulo.
export function Section({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-6", className)}>
      {(title || actions) && (
        <div className="flex items-end justify-between gap-4 mb-3.5">
          <div>
            {title && <h2 className="font-display font-semibold text-lg text-ink">{title}</h2>}
            {subtitle && <p className="text-sm text-ink-3 mt-0.5">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
