"use client";

// Entitlements de plano (0C §4.4 / 0D §3): "acesso = papel E plano". O plano do
// tenant libera um conjunto de módulos; combina com o papel (RBAC) e a feature flag.
// Deriva do orgId da sessão. Em produção viria do billing.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { orgEntitlements, isModuleEntitled } from "@/server/domain/store";
import { useSession } from "./session";

interface EntitlementsApi {
  entitlements: string[];
  isEntitled: (moduleId: string) => boolean;
}

const Ctx = createContext<EntitlementsApi | null>(null);

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const user = useSession();
  const value = useMemo<EntitlementsApi>(() => {
    const entitlements = orgEntitlements(user.orgId);
    return { entitlements, isEntitled: (m: string) => isModuleEntitled(m, entitlements) };
  }, [user.orgId]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements(): EntitlementsApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useEntitlements must be used within <EntitlementsProvider>");
  return c;
}
