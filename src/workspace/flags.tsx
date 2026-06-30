"use client";

// Estado de feature flags compartilhado (0C/0D): o Painel do Dono alterna e o
// rail/command palette refletem na hora. Inicializa do seed; Onda 4: persiste
// via PATCH /api/owner/flags para sobreviver a recargas de página.
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface FlagsApi {
  enabled: Record<string, boolean>;
  toggle: (module: string) => void;
  isModuleEnabled: (moduleId: string) => boolean;
}

const Ctx = createContext<FlagsApi | null>(null);

export function FlagsProvider({
  children,
  initialFlags,
}: {
  children: ReactNode;
  /** Estado inicial das flags — computado server-side em page.tsx. */
  initialFlags: Record<string, boolean>;
}) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(initialFlags);

  const toggle = useCallback((module: string) => {
    setEnabled((s) => {
      const next = !s[module];
      // Persistência otimista: atualiza o estado local imediatamente e dispara
      // PATCH /api/owner/flags no background (persiste no store do servidor).
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
