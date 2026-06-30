"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip — dica de contexto exibida com delay no hover/foco. Implementação
// simples sem portal: posicionada em CSS relativo ao host inline. Para anchors
// em bordas de tela use side="bottom" ou "left". Delay padrão: 400 ms.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";

const POSITION: Record<"top" | "right" | "bottom" | "left", string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  /** Delay em ms antes de exibir o tooltip. */
  delayMs?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  delayMs = 400,
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timer.current = setTimeout(() => setVisible(true), delayMs);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  };

  // Limpa o timer ao desmontar.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            "absolute z-50 w-max max-w-[14rem] px-2.5 py-1.5",
            "rounded-[var(--radius-sm)] bg-surface-4 border border-line",
            "text-xs text-ink shadow-[var(--shadow-md)] pointer-events-none",
            "animate-[rise_0.1s_var(--ease-out-expo)_both]",
            POSITION[side],
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
