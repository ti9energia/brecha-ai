import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";
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
// Usa background-position animation (keyframe "shimmer" em globals.css) para
// varrer o brilho sobre o placeholder. Sem div extra — mais performático.
// Aceita `style` para permitir animationDelay em listas de skeletons.
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("rounded-[var(--radius-md)]", className)}
      style={{
        backgroundImage:
          "linear-gradient(90deg, var(--surface-2) 0%, var(--surface-4) 45%, var(--surface-2) 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.8s linear infinite",
        ...style,
      }}
    />
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

// ── Table ─────────────────────────────────────────────────────────────────────
// Tabela genérica responsiva com suporte a ordenação declarativa. O estado de
// ordenação fica no componente pai; Table é puramente visual (sem hooks).
export interface TableColumn<T> {
  key: string;
  header: string;
  /** Renderizador customizado; padrão: String(row[key]). */
  render?: (row: T, i: number) => ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  /** Classe extra aplicada à célula e ao cabeçalho. */
  cellClass?: string;
}

const ALIGN: Record<"left" | "center" | "right", string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function Table<T>({
  columns,
  rows,
  keyBy,
  sortKey,
  sortDir = "asc",
  onSort,
  emptyLabel = "—",
  className,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  /** Retorna chave única para cada linha (usada no key do React). */
  keyBy: (row: T) => string | number;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-auto rounded-[var(--radius-md)] border border-line", className)}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-line bg-surface-2">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                aria-sort={
                  col.sortable && sortKey === col.key
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                className={cn(
                  "px-3 py-2.5 font-medium text-ink-3 eyebrow",
                  col.align ? ALIGN[col.align] : "text-left",
                  col.cellClass,
                  col.sortable && onSort && "cursor-pointer select-none hover:text-ink",
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    <span aria-hidden="true" className="text-brand text-base leading-none">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-ink-3 text-sm">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={keyBy(row)}
                className="border-b border-line last:border-0 hover:bg-surface-2/50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 py-2.5 text-ink",
                      col.align ? ALIGN[col.align] : "text-left",
                      col.cellClass,
                    )}
                  >
                    {col.render
                      ? col.render(row, i)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Field ────────────────────────────────────────────────────────────────────
// Container semântico para controles de formulário: label, hint e mensagem
// de erro acessível (role="alert"). Não renderiza o controle — recebe como filho.
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink leading-none">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-3">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

// ── Input ────────────────────────────────────────────────────────────────────
export function Input({
  error,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={cn(
        "input",
        error &&
          "border-danger focus:border-danger focus:shadow-[0_0_0_3px_var(--danger-soft)]",
        className,
      )}
      {...rest}
    />
  );
}

// ── SelectInput ───────────────────────────────────────────────────────────────
// Renderiza um <select> com o mesmo visual de Input. O nome é SelectInput para
// não colidir com o elemento nativo <select>.
export function SelectInput({
  error,
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      className={cn(
        "input",
        error && "border-danger",
        className,
      )}
      {...rest}
    />
  );
}

// ── Switch ───────────────────────────────────────────────────────────────────
// Toggle acessível: role="switch" + aria-checked + foco visível. Controlado
// pelo pai — sem estado interno.
export function Switch({
  checked,
  onChange,
  label,
  id,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-brand" : "bg-surface-4",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}

// ── RadioGroup ────────────────────────────────────────────────────────────────
// Grupo de rádio controlado com design visual de "card selecionado". Controlado.
export function RadioGroup<T extends string>({
  name,
  value: selected,
  onChange,
  options,
  className,
}: {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; hint?: string }[];
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn("flex flex-col gap-2", className)}>
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            "flex items-start gap-3 cursor-pointer p-3 rounded-[var(--radius-md)] border transition-colors",
            selected === opt.value
              ? "border-[color:var(--border-gold)] bg-[var(--brand-soft)]"
              : "border-line hover:border-line-strong hover:bg-surface-2",
          )}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={selected === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          <span
            aria-hidden="true"
            className={cn(
              "mt-0.5 size-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
              selected === opt.value ? "border-brand" : "border-line-strong",
            )}
          >
            {selected === opt.value && (
              <span className="size-2 rounded-full bg-brand" />
            )}
          </span>
          <span>
            <span className="text-sm font-medium text-ink">{opt.label}</span>
            {opt.hint && (
              <span className="block text-xs text-ink-3 mt-0.5">{opt.hint}</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

// ── TabList / TabPanel ────────────────────────────────────────────────────────
// Tabs controladas: o pai gerencia qual aba está ativa. TabList renderiza a
// barra de abas; TabPanel o conteúdo, apenas para a aba ativa.
export function TabList({
  tabs,
  activeTab,
  onTabChange,
  className,
}: {
  tabs: { id: string; label: string; icon?: ReactNode; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("flex items-center gap-0 border-b border-line overflow-x-auto no-scrollbar", className)}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "relative shrink-0 px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
            activeTab === tab.id
              ? "text-ink after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-brand after:rounded-full"
              : "text-ink-3 hover:text-ink hover:bg-surface-2 rounded-t-[var(--radius-sm)]",
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[1.2rem] h-4.5 px-1 rounded-full text-[0.68rem] font-medium",
                  activeTab === tab.id
                    ? "bg-brand text-on-brand"
                    : "bg-surface-3 text-ink-3",
                )}
              >
                {tab.count}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

export function TabPanel({
  tabId,
  activeTab,
  children,
  className,
}: {
  tabId: string;
  activeTab: string;
  children: ReactNode;
  className?: string;
}) {
  if (activeTab !== tabId) return null;
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      className={className}
    >
      {children}
    </div>
  );
}
