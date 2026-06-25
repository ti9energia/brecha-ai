import { handleWhatsappMessage, verifyWhatsappSignature, extractInbound } from "@/server/whatsapp/gateway";
import { ok, fail } from "@/server/http";
import { rateLimit } from "@/server/security/rateLimit";

// GET /api/whatsapp/webhook — handshake de verificação do Meta Cloud API.
// (hub.mode=subscribe & hub.verify_token correto → ecoa o hub.challenge.)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verify = process.env.WHATSAPP_VERIFY_TOKEN || "brecha-verify";
  if (mode === "subscribe" && token === verify && challenge) {
    return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new Response("forbidden", { status: 403 });
}

// POST /api/whatsapp/webhook — mensagem de entrada. Assinatura validada quando
// WHATSAPP_APP_SECRET está definido (Meta envia X-Hub-Signature-256). O gateway
// resolve o usuário pelo número e repassa ao mesmo cérebro do copiloto.
export async function POST(req: Request) {
  const limited = rateLimit(req, "whatsapp", { max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const raw = await req.text();

  const secret = process.env.WHATSAPP_APP_SECRET;
  if (secret) {
    const sig = req.headers.get("x-hub-signature-256") ?? "";
    if (!(await verifyWhatsappSignature(raw, sig, secret))) {
      return fail("INVALID_SIGNATURE", "auth.forbidden", 401);
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail("INVALID_BODY", "errors.invalid_body");
  }

  const msg = extractInbound(body);
  if (!msg || !msg.text.trim()) return fail("NO_MESSAGE", "errors.no_message");

  return ok(handleWhatsappMessage(msg));
}
