"use client";

// Estado de feature flags compartilhado (0C/0D): o Painel do Dono alterna e o
// rail/command palette refletem na hora. Inicializa do seed; em produção viria
// do backend por tenant/plano. Um módulo SEM flag declarada é sempre habilitado
// (núcleo); módulos COM flag respeitam o estado.
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { listFlags } from "@/server/domain/store";

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
    setEnabled((s) => ({ ...s, [module]: !s[module] }));
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
