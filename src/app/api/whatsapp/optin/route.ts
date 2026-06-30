import { requestWhatsappOptIn, sendWhatsapp } from "@/server/whatsapp/gateway";
import { ok, fail } from "@/server/http";
import { requireSession } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// POST /api/whatsapp/optin (0B §3 DoD a) — usuário logado vincula um número.
// Gera um código e o ENVIA pelo WhatsApp (no demo, registra na saída — nunca volta
// no corpo da resposta). O número fica vinculado quando o usuário responde o código
// pelo WhatsApp (ver gateway.confirmWhatsappOptIn). Requer sessão (middleware + handler).
export async function POST(req: Request) {
  const limited = await rateLimit(req, "wa-optin", { max: 10, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireSession();
  if (gate.error) return gate.error;

  const body = await req.json().catch(() => ({}));
  const number = body && typeof body === "object" ? (body as Record<string, unknown>).number : undefined;
  if (typeof number !== "string" || number.replace(/[^0-9]/g, "").length < 8) {
    return fail("INVALID_NUMBER", "errors.missing_params");
  }

  const { number: normalized, code } = requestWhatsappOptIn(gate.session.sub, number);
  // SWAP (produção): enviar o código via template do WhatsApp Business. No demo, vai
  // para a saída (sendWhatsapp). O código NUNCA é devolvido no corpo (segurança).
  await sendWhatsapp(normalized, `Brecha.ai: seu código de verificação é ${code}. Responda com ele para vincular este número.`);
  return ok({ number: normalized, sent: true }, { optin: true });
}
