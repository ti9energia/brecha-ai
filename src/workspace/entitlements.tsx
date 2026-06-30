"use client";

// Entitlements de plano (0C §4.4 / 0D §3): "acesso = papel E plano".
// Onda 6: entitlementIds são passados do server (page.tsx) como prop —
// sem importar store.ts no bundle do cliente. O provider expõe isEntitled()
// para NavRail, BottomNav e views verificarem acesso a módulos.
import { createContext, useContext, useMemo, type ReactNode } from "react";

interface EntitlementsApi {
  entitlements: string[];
  isEntitled: (moduleId: string) => boolean;
}

const Ctx = createContext<EntitlementsApi | null>(null);

// Módulos com gating de plano (espelha PLAN_GATED_MODULES do store).
// Os demais (núcleo / governança) são sempre liberados.
const PLAN_GATED = new Set(["simulator", "agent", "clients", "client"]);

export function EntitlementsProvider({
  children,
  entitlementIds,
}: {
  children: ReactNode;
  /** IDs dos módulos liberados pelo plano — computados server-side em page.tsx. */
  entitlementIds: string[];
}) {
  const value = useMemo<EntitlementsApi>(() => {
    const isEntitled = (moduleId: string) => {
      if (!PLAN_GATED.has(moduleId)) return true;
      return entitlementIds.includes(moduleId);
    };
    return { entitlements: entitlementIds, isEntitled };
  }, [entitlementIds]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements(): EntitlementsApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useEntitlements must be used within <EntitlementsProvider>");
  return c;
}
