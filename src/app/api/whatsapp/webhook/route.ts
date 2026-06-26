import { handleWhatsappMessage, verifyWhatsappSignature, extractInbound } from "@/server/whatsapp/gateway";
import { ok, fail } from "@/server/http";
import { rateLimit } from "@/server/security/rateLimit";

// Lido em tempo de chamada (não no load do módulo) para ser testável/estável.
function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

// Token de verificação do handshake (GET). Em produção é OBRIGATÓRIO: nunca
// embarcamos um default público — senão qualquer um completaria o handshake do Meta.
function verifyToken(): string | null {
  return process.env.WHATSAPP_VERIFY_TOKEN || (isProd() ? null : "brecha-verify");
}

// GET /api/whatsapp/webhook — handshake de verificação do Meta Cloud API.
// (hub.mode=subscribe & hub.verify_token correto → ecoa o hub.challenge.)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verify = verifyToken();
  if (verify && mode === "subscribe" && token === verify && challenge) {
    return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new Response("forbidden", { status: 403 });
}

// POST /api/whatsapp/webhook — mensagem de entrada. A assinatura do Meta
// (X-Hub-Signature-256) é SEMPRE exigida em produção: sem WHATSAPP_APP_SECRET o
// endpoint fica fail-closed (503), pois não há como provar a autenticidade — caso
// contrário qualquer POST seria processado como o usuário vinculado ao número
// (impersonação + forja de auditoria). Espelha o fail-closed do AUTH_SECRET.
export async function POST(req: Request) {
  const limited = rateLimit(req, "whatsapp", { max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const raw = await req.text();

  const secret = process.env.WHATSAPP_APP_SECRET;
  if (secret) {
    const sig = req.headers.get("x-hub-signature-256") ?? "";
    if (!(await verifyWhatsappSignature(raw, sig, secret))) {
      return fail("INVALID_SIGNATURE", "auth.forbidden", 403);
    }
  } else if (isProd()) {
    // Produção sem segredo configurado: recusa em vez de aceitar mensagens não verificadas.
    return fail("WEBHOOK_NOT_CONFIGURED", "errors.webhook_unconfigured", 503);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail("INVALID_BODY", "errors.invalid_body");
  }

  const msg = extractInbound(body);
  // aceita texto OU mídia (áudio/imagem/PDF — 0B §4)
  if (!msg || (!msg.text.trim() && !msg.media)) return fail("NO_MESSAGE", "errors.no_message");

  return ok(await handleWhatsappMessage(msg));
}
