"use client";

// Estado de feature flags compartilhado (0C/0D): o Painel do Dono alterna e o
// rail/command palette refletem na hora. Inicializa do seed; Onda 4: persiste
// via PATCH /api/owner/flags para sobreviver a recargas de página.
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { listFlags, setFlag } from "@/server/domain/store";

interface FlagsApi {
  enabled: Record<string, boolean>;
  toggle: (module: string) => void;
  isModuleEnabled: (moduleId: string) => boolean;
}

const Ctx = createContext<FlagsApi | null>(null);

export function FlagsProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(listFlags().map((f) => [f.module, f.enabled])),
  );

  const toggle = useCallback((module: string) => {
    setEnabled((s) => {
      const next = !s[module];
      // Persistência otimista: atualiza o store in-memory imediatamente e dispara
      // PATCH /api/owner/flags no background (sem bloquear a UI).
      setFlag(module, next); // store in-memory (client — sem round-trip para demo)
      fetch("/api/owner/flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, enabled: next }),
      }).catch(() => {}); // falha silenciosa — a UI já reflete o estado
      return { ...s, [module]: next };
    });
  }, []);

  const isModuleEnabled = useCallback(
    (moduleId: string) => (moduleId in enabled ? enabled[moduleId] : true),
    [enabled],
  );

  return <Ctx.Provider value={{ enabled, toggle, isModuleEnabled }}>{children}</Ctx.Provider>;
}

export function useFlags(): FlagsApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFlags must be used within <FlagsProvider>");
  return c;
}
