import { ownerKpis, listTenants, getPlans, listFlags, ownerAudit } from "@/server/domain/store";
import { ok } from "@/server/http";

// GET /api/owner — agregado do Painel do Dono (0C). Atrás de papel platform_*.
export async function GET() {
  return ok({
    kpis: ownerKpis(),
    tenants: listTenants(),
    plans: getPlans(),
    flags: listFlags(),
    audit: ownerAudit(),
  });
}
