import { domainBrain } from "@/server/ai/brain";
import { askClaude } from "@/server/ai/claude";
import { resolveLocale } from "@/i18n/config";
import { ok, fail } from "@/server/http";

// POST /api/ai/chat — turno do Copiloto (0A §2.9). Tenta o Claude (se houver
// chave) e cai no cérebro de domínio determinístico caso contrário.
export async function POST(req: Request) {
  let body: { messages?: { role: "user" | "assistant"; content: string }[]; locale?: string };
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_BODY", "errors.invalid_body");
  }
  const messages = body.messages ?? [];
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return fail("NO_MESSAGE", "errors.no_message");
  const locale = resolveLocale(body.locale);

  // 1) cérebro de domínio: sempre calcula ações + fontes a partir dos dados reais
  const local = domainBrain(last.content, locale);

  // 2) se houver chave, o Claude refina o texto (mantendo ações/fontes do domínio)
  const claude = await askClaude(messages, locale);

  const reply = claude
    ? { ...claude, sources: local.sources, actions: local.actions }
    : local;

  return ok(reply);
}
