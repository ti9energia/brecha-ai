import { getStructure } from "@/server/domain/store";
import { ok } from "@/server/http";

// GET/PUT /api/structure — perfil fiscal/jurídico do cliente.
export async function GET() {
  return ok(getStructure());
}

export async function PUT(req: Request) {
  // Demo: aceita o patch e devolve a estrutura mesclada (sem persistir em disco).
  const patch = await req.json().catch(() => ({}));
  return ok({ ...getStructure(), ...patch }, { saved: true });
}
