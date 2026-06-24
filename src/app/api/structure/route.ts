import { getStructure } from "@/server/domain/store";
import { ok } from "@/server/http";

// GET/PUT /api/structure — perfil fiscal/jurídico do cliente.
export async function GET() {
  return ok(getStructure());
}

const EDITABLE = ["legalName", "regime", "mainActivity", "headquarters", "annualRevenue", "headcount"] as const;

export async function PUT(req: Request) {
  // Demo: aceita só campos conhecidos (sem mass-assignment) e devolve mesclado.
  const patch = await req.json().catch(() => ({}));
  const safe: Record<string, unknown> = {};
  if (patch && typeof patch === "object") {
    for (const k of EDITABLE) {
      if (k in patch) safe[k] = (patch as Record<string, unknown>)[k];
    }
  }
  return ok({ ...getStructure(), ...safe }, { saved: true });
}
