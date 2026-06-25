import { getStructure, updateStructure } from "@/server/domain/store";
import { ok } from "@/server/http";

// GET/PUT /api/structure — perfil fiscal/jurídico do cliente.
export async function GET() {
  return ok(getStructure());
}

export async function PUT(req: Request) {
  // Aceita só campos conhecidos (sem mass-assignment), coage tipos e PERSISTE.
  const patch = await req.json().catch(() => ({}));
  const saved = updateStructure(patch && typeof patch === "object" ? (patch as Record<string, unknown>) : {});
  return ok(saved, { saved: true });
}
