"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";
import { useTranslations } from "@/i18n/provider";
import { cn } from "./cn";

type Tone = "success" | "info" | "warning" | "error";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
}

interface ToastApi {
  toast: (t: { title: string; description?: string; tone?: Tone; duration?: number }) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be used within <ToastProvider>");
  return c;
}

// Versão que não lança fora do provider (componentes reusados na landing etc.).
export function useToastOptional(): ToastApi {
  const c = useContext(Ctx);
  return c ?? { toast: () => {} };
}

const ICON: Record<Tone, ReactNode> = {
  success: <CheckCircle2 size={17} className="text-positive" />,
  info: <Info size={17} className="text-info" />,
  warning: <AlertTriangle size={17} className="text-warning" />,
  error: <XCircle size={17} className="text-danger" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);

  const remove = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback<ToastApi["toast"]>(
    ({ title, description, tone = "success", duration = 4000 }) => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-3), { id, title, description, tone }]);
      timers.current.push(window.setTimeout(() => remove(id), duration));
    },
    [remove],
  );

  // Limpa timers pendentes ao desmontar (evita callback órfão após unmount).
  useEffect(() => () => { timers.current.forEach((h) => clearTimeout(h)); }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed z-[95] bottom-4 right-4 flex flex-col gap-2 w-[min(92vw,360px)] pointer-events-none">
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className="pointer-events-auto glass rounded-[var(--radius-md)] border border-line-strong shadow-[var(--shadow-lg)] p-3.5 flex items-start gap-3"
            style={{ animation: "toast-in 0.4s var(--ease-out-expo)" }}
          >
            <span className="mt-0.5 shrink-0">{ICON[item.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink leading-tight">{item.title}</p>
              {item.description && <p className="mt-0.5 text-xs text-ink-3 text-pretty">{item.description}</p>}
            </div>
            <button
              onClick={() => remove(item.id)}
              className={cn("shrink-0 grid place-items-center size-6 rounded-[var(--radius-sm)] text-ink-4 hover:text-ink hover:bg-surface-3 transition-colors")}
              aria-label={t("close")}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
