import { ok, fail } from "@/server/http";
import { rateLimit, rateLimitBy } from "@/server/security/rateLimit";
import { recordAiAction } from "@/server/domain/store";

// POST /api/auth/forgot — solicita reset de senha. SEMPRE responde ok (anti-enumeração:
// nunca revela se o e-mail existe). SWAP (produção): se existir, envia o link por e-mail.
// No demo, registra a solicitação. Público (middleware libera /api/auth).
export async function POST(req: Request) {
  const limited = rateLimit(req, "forgot", { max: 10, windowMs: 60_000 });
  if (limited) return limited;

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_BODY", "errors.invalid_body");
  }
  const email = String(body?.email ?? "").slice(0, 160).trim().toLowerCase();
  if (!email) return fail("MISSING_EMAIL", "errors.missing_params");

  const byEmail = rateLimitBy(email, "forgot-email", { max: 3, windowMs: 60_000 });
  if (byEmail) return byEmail;

  recordAiAction({ actor: email, action: "Reset de senha solicitado", detail: "(demo: e-mail não enviado)" });
  return ok({ requested: true });
}
