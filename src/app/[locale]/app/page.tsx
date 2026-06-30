import { cookies } from "next/headers";
import { Workspace } from "@/workspace/Workspace";
import { verifySession, SESSION_COOKIE } from "@/server/auth/session";
import { orgEntitlements } from "@/server/domain/store";
import { listFlags } from "@/server/domain/store";

// Dinâmico: lê a sessão (cookie) para passar papel/identidade ao workspace.
// O middleware já garante autenticação antes de chegar aqui.
// Onda 6: computa entitlements e flags NO SERVIDOR → passa para o workspace
// como props serializáveis, evitando que componentes cliente importem store.ts.
export const dynamic = "force-dynamic";

export default async function AppPage() {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  const user = {
    name: session?.name ?? "—",
    email: session?.email ?? "",
    role: session?.role ?? "viewer",
    orgId: session?.orgId ?? "",
    accountType: session?.accountType ?? "company",
    imp: session?.imp,
  };

  // Dados computados no servidor: entitlements (permissões de plano) e flags
  // (feature flags). O cliente recebe apenas os valores finais — sem depender
  // de store.ts no bundle do browser.
  const entitlementIds = orgEntitlements(user.orgId);
  const initialFlags = Object.fromEntries(
    listFlags().map((f) => [f.module, f.enabled]),
  );

  return (
    <Workspace
      user={user}
      entitlementIds={entitlementIds}
      initialFlags={initialFlags}
    />
  );
}
