import { ownerKpis, listTenants, getPlans, listFlags, ownerAudit, aiFeedbackStats } from "@/server/domain/store";
import { ok } from "@/server/http";
import { requireRole } from "@/server/auth/guard";

// GET /api/owner — agregado do Painel do Dono (0C). Exige papel platform_owner:
// expõe dados cross-tenant (MRR, gasto de IA, trilha de auditoria da plataforma).
// Onda 6: inclui aiFeedbackStats para eliminar import de store nas views cliente.
export async function GET() {
  const { error } = await requireRole("platform_owner");
  if (error) return error;

  return ok({
    kpis: ownerKpis(),
    tenants: listTenants(),
    plans: getPlans(),
    flags: listFlags(),
    audit: ownerAudit(),
    aiFeedbackStats: aiFeedbackStats(),
  });
}
