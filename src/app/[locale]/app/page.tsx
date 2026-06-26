import { cookies } from "next/headers";
import { Workspace } from "@/workspace/Workspace";
import { verifySession, SESSION_COOKIE } from "@/server/auth/session";

// Dinâmico: lê a sessão (cookie) para passar papel/identidade ao workspace.
// O middleware já garante autenticação antes de chegar aqui.
export const dynamic = "force-dynamic";

export default async function AppPage() {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  const user = {
    name: session?.name ?? "—",
    email: session?.email ?? "",
    role: session?.role ?? "viewer",
    orgId: session?.orgId ?? "",
    imp: session?.imp,
  };
  return <Workspace user={user} />;
}
