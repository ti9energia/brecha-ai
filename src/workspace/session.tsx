"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AccountType } from "@/server/auth/session";

export interface WorkspaceUser {
  name: string;
  email: string;
  role: string;
  orgId: string;
  accountType: AccountType; // perfil do produto (autônomo/escritório/dono) → quais abas
  imp?: string; // sub do dono quando esta sessão é uma impersonação (mostra o banner)
}

export type { AccountType };

const Ctx = createContext<WorkspaceUser | null>(null);

export function SessionProvider({ user, children }: { user: WorkspaceUser; children: ReactNode }) {
  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}

export function useSession(): WorkspaceUser {
  const u = useContext(Ctx);
  if (!u) throw new Error("useSession must be used within <SessionProvider>");
  return u;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
