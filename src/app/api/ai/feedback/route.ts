import { cookies } from "next/headers";
import { recordAiFeedback } from "@/server/domain/store";
import { ok, fail } from "@/server/http";
import { rateLimit } from "@/server/security/rateLimit";
import { verifySession, SESSION_COOKIE } from "@/server/auth/session";

// POST /api/ai/feedback — 👍/👎 numa resposta do Copiloto (0A §2.9). Captura o
// sinal para o dataset de treino do AI Core, isolado por tenant (orgId da sessão).
export async function POST(req: Request) {
  const limited = rateLimit(req, "ai-feedback", { max: 60, windowMs: 60_000 });
  if (limited) return limited;

  let body: { rating?: unknown; message?: unknown; locale?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_BODY", "errors.invalid_body");
  }
  const rating = body?.rating === "up" || body?.rating === "down" ? body.rating : null;
  if (!rating) return fail("INVALID_RATING", "errors.invalid_body");

  const message = typeof body?.message === "string" ? body.message.slice(0, 4000) : "";
  const locale = typeof body?.locale === "string" ? body.locale.slice(0, 10) : "pt-BR";
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);

  const stats = recordAiFeedback({
    rating,
    message,
    locale,
    userId: session?.sub ?? "anon",
    orgId: session?.orgId ?? "unknown",
  });
  return ok(stats);
}
