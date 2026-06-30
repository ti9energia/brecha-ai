"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Dialog & Sheet — sobreposições acessíveis com focus-trap e Escape.
// Dialog: modal centralizado. Sheet: gaveta que desliza da direita.
// Ambos usam o hook useFocusTrap (já existente) e o botão X padrão.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "./useFocusTrap";
import { useTranslations } from "@/i18n/provider";
import { cn } from "./cn";

// ── Dialog ───────────────────────────────────────────────────────────────────
const DIALOG_SIZE = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
} as const;

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: keyof typeof DIALOG_SIZE;
  /** Classe extra aplicada ao painel (não ao backdrop). */
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  className,
}: DialogProps) {
  const tc = useTranslations("common");
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fade-in_0.15s_ease-out_both]"
        onClick={onClose}
      />
      {/* Painel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "dialog-title" : undefined}
        aria-describedby={description ? "dialog-desc" : undefined}
        className={cn(
          "relative w-full glass rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]",
          "animate-[rise_0.2s_var(--ease-out-expo)_both]",
          DIALOG_SIZE[size],
          className,
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 p-5 border-b border-line">
            <div>
              {title && (
                <h2 id="dialog-title" className="font-semibold text-ink">
                  {title}
                </h2>
              )}
              {description && (
                <p id="dialog-desc" className="mt-0.5 text-sm text-ink-3">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label={tc("close")}
              className="shrink-0 grid place-items-center size-8 rounded-[var(--radius-sm)] text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Sheet ────────────────────────────────────────────────────────────────────
// Drawer que desliza da direita. Bom para formulários e detalhes contextuais
// sem perder o estado da view por baixo.
interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Largura do painel — padrão: tela cheia no mobile, 28rem no desktop. */
  widthClass?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  widthClass = "w-[min(28rem,100vw)]",
}: SheetProps) {
  const tc = useTranslations("common");
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fade-in_0.15s_ease-out_both]"
        onClick={onClose}
      />
      {/* Painel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "sheet-title" : undefined}
        className={cn(
          "relative h-full glass border-l border-line shadow-[var(--shadow-lg)] flex flex-col",
          "animate-[slide-in-right_0.25s_var(--ease-out-expo)_both]",
          widthClass,
        )}
      >
        <div className="flex items-center justify-between gap-4 p-5 border-b border-line shrink-0">
          {title && <h2 id="sheet-title" className="font-semibold text-ink">{title}</h2>}
          <button
            onClick={onClose}
            aria-label={tc("close")}
            className="ml-auto grid place-items-center size-8 rounded-[var(--radius-sm)] text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
