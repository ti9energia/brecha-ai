import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

// ── Button ───────────────────────────────────────────────────────────────────
type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-brand text-on-brand hover:brightness-110 active:brightness-95 shadow-[0_10px_30px_-12px_rgba(202,138,4,0.6)] border border-transparent",
  secondary:
    "bg-surface-2 text-ink border border-line hover:bg-surface-3 hover:border-line-strong",
  ghost: "text-ink-2 hover:text-ink hover:bg-surface-2 border border-transparent",
  outline:
    "border border-line-gold text-brand hover:bg-[var(--brand-soft)] bg-transparent",
  danger: "bg-[var(--danger-soft)] text-danger border border-[color:var(--danger)]/30 hover:bg-[var(--danger-soft)]",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8rem] gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-10 px-4 text-sm gap-2 rounded-[var(--radius-md)]",
  lg: "h-12 px-6 text-[0.95rem] gap-2.5 rounded-[var(--radius-md)]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-200 ease-[var(--ease-out-expo)] select-none disabled:opacity-50 disabled:pointer-events-none",
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}
export function Button({ variant = "primary", size = "md", className, ...rest }: ButtonProps) {
  return <button className={buttonClass(variant, size, className)} {...rest} />;
}

// ── Card / Panel ─────────────────────────────────────────────────────────────
export function Card({
  className,
  children,
  hover,
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
}) {
  return (
    <div className={cn("panel hairline", hover && "gold-edge", className)}>{children}</div>
  );
}

// ── Eyebrow / section label ──────────────────────────────────────────────────
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

// ── Chip / Badge ─────────────────────────────────────────────────────────────
type Tone = "gold" | "positive" | "warning" | "danger" | "info" | "neutral";
const TONE: Record<Tone, string> = {
  gold: "text-brand border-[color:var(--border-gold)] bg-[var(--brand-soft)]",
  positive: "text-positive border-[color:var(--positive)]/25 bg-[var(--positive-soft)]",
  warning: "text-warning border-[color:var(--warning)]/25 bg-[var(--warning-soft)]",
  danger: "text-danger border-[color:var(--danger)]/25 bg-[var(--danger-soft)]",
  info: "text-info border-[color:var(--info)]/25 bg-[var(--info-soft)]",
  neutral: "text-ink-2 border-line bg-surface-2",
};
export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return <span className={cn("chip", TONE[tone], className)}>{children}</span>;
}

// ── Meter ────────────────────────────────────────────────────────────────────
export function Meter({ value, tone = "gold", className }: { value: number; tone?: Tone; className?: string }) {
  const fill: Record<Tone, string> = {
    gold: "linear-gradient(90deg, var(--brand-deep), var(--brand-bright))",
    positive: "linear-gradient(90deg, color-mix(in oklab, var(--positive) 60%, black), var(--positive))",
    warning: "linear-gradient(90deg, color-mix(in oklab, var(--warning) 60%, black), var(--warning))",
    danger: "linear-gradient(90deg, color-mix(in oklab, var(--danger) 60%, black), var(--danger))",
    info: "linear-gradient(90deg, color-mix(in oklab, var(--info) 60%, black), var(--info))",
    neutral: "var(--ink-4)",
  };
  return (
    <div className={cn("meter", className)}>
      <span style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, background: fill[tone] }} />
    </div>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="mb-5 grid place-items-center size-16 rounded-full border border-line bg-surface-2 text-brand">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {hint && <p className="mt-2 max-w-sm text-sm text-ink-3 text-pretty">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-[var(--radius-md)] bg-surface-2", className)}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-[var(--surface-4)] to-transparent" />
    </div>
  );
}

// ── Stat ─────────────────────────────────────────────────────────────────────
export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
}) {
  const toneText: Record<Tone, string> = {
    gold: "text-brand",
    positive: "text-positive",
    warning: "text-warning",
    danger: "text-danger",
    info: "text-info",
    neutral: "text-ink",
  };
  return (
    <div>
      <p className="eyebrow mb-2">{label}</p>
      <p className={cn("font-display text-2xl md:text-[1.7rem] leading-none tnum", toneText[tone])}>{value}</p>
      {hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

// ── Divider dot ──────────────────────────────────────────────────────────────
export function Dot() {
  return <span className="divider-dot select-none">·</span>;
}
