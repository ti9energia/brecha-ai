import { cookies } from "next/headers";
import { aiChat } from "@/server/ai-core";
import { resolveLocale } from "@/i18n/config";
import { ok, fail } from "@/server/http";
import { rateLimit, rateLimitBy } from "@/server/security/rateLimit";
import { verifySession, SESSION_COOKIE } from "@/server/auth/session";

// Limites de entrada — corta abuso de custo/DoS antes de chamar a Anthropic.
const MAX_MESSAGES = 20;
const MAX_CONTENT = 4000;

type ChatMsg = { role: "user" | "assistant"; content: string };

// POST /api/ai/chat — turno do Copiloto (0A §2.9). Tenta o Claude (se houver
// chave) e cai no cérebro de domínio determinístico caso contrário.
export async function POST(req: Request) {
  // Limite por IP (coarse) + por usuário (o custo da Anthropic é por conta, então
  // o teto que importa é o do usuário — resiste à rotação de IP).
  const limited = rateLimit(req, "ai-chat", { max: 30, windowMs: 60_000 });
  if (limited) return limited;
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (session) {
    const byUser = rateLimitBy(session.sub, "ai-chat-user", { max: 30, windowMs: 60_000 });
    if (byUser) return byUser;
  }

  let body: { messages?: unknown; locale?: string };
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_BODY", "errors.invalid_body");
  }

  // Sanitiza e limita: só papéis válidos, content string, ≤ MAX_CONTENT, últimas N.
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: ChatMsg[] = raw
    .filter(
      (m): m is ChatMsg =>
        !!m &&
        typeof m === "object" &&
        ((m as ChatMsg).role === "user" || (m as ChatMsg).role === "assistant") &&
        typeof (m as ChatMsg).content === "string",
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT) }));

  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last || !last.content.trim()) return fail("NO_MESSAGE", "errors.no_message");
  const locale = resolveLocale(body.locale);

  // O produto fala só com o AI Core: ele combina ações/fontes do domínio, RAG e o
  // texto do modelo (provider trocável) e devolve a resposta pronta. Isolado por
  // tenant via orgId da sessão (se houver).
  const reply = await aiChat(messages, locale, undefined, session?.orgId);
  return ok(reply);
}
