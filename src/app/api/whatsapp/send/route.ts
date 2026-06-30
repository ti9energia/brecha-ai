import { sendWhatsapp } from "@/server/whatsapp/gateway";
import { ok, fail } from "@/server/http";
import { rateLimit } from "@/server/security/rateLimit";
import { requireRole } from "@/server/auth/guard";

// POST /api/whatsapp/send — envio de saída (0B §7). Privilegiado (manager+):
// enviar em nome da plataforma. Usado por respostas e pelo push do agente.
export async function POST(req: Request) {
  const limited = await rateLimit(req, "wa-send", { max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { error } = await requireRole("manager", "org_admin", "platform_owner");
  if (error) return error;

  let body: { to?: unknown; text?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_BODY", "errors.invalid_body");
  }
  if (typeof body?.to !== "string" || typeof body?.text !== "string" || !body.text.trim()) {
    return fail("INVALID_BODY", "errors.invalid_body");
  }
  return ok(await sendWhatsapp(body.to, body.text));
}
