import { listFirmClients, firmPortfolio, clientBrechas } from "@/server/domain/store";
import { ok } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET /api/clients — lista a carteira de clientes do escritório + estatísticas
// de portfólio. Onda 6: cada cliente inclui brechasCount para eliminar import
// de clientBrechas nas views cliente (server-only boundary).
export async function GET(req: Request) {
  const limited = rateLimit(req, "clients-read", { max: 120, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("tributarista", "manager", "org_admin", "platform_staff", "platform_owner");
  if (gate.error) return gate.error;
  const clients = listFirmClients().map((c) => ({
    ...c,
    brechasCount: clientBrechas(c.id).length,
  }));
  const portfolio = firmPortfolio();
  return ok({ clients, portfolio });
}
