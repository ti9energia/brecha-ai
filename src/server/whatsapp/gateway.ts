// ─────────────────────────────────────────────────────────────────────────────
// Gateway WhatsApp (0B) — traduz WhatsApp ⇄ AI Core. SEM lógica de negócio: só
// resolve o usuário pelo número (vínculo/opt-in), repassa ao MESMO cérebro do
// copiloto (domainBrain) e formata a resposta. Permissão-aware via o papel do
// usuário vinculado; toda mensagem é registrada (auditoria). Um provider real
// (Meta Cloud API / Twilio) apenas encaminha o webhook para cá.
// ─────────────────────────────────────────────────────────────────────────────
import { aiChat } from "@/server/ai-core";
import type { CopilotReply } from "@/server/ai/brain";
import { userById } from "@/server/auth/users";
import { recordAiAction } from "@/server/domain/store";
import { getT } from "@/i18n/server";
import { isLocale, type Locale } from "@/i18n/config";

// Vínculo número↔usuário (seed). Em produção: opt-in com verificação por código.
const BINDINGS: Record<string, string> = {
  "+5511999990000": "u-marina", // CFO (manager)
  "+5511988887777": "u-helena", // tributarista (manager)
};

function normalizeNumber(n: string): string {
  const trimmed = n.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/[^0-9]/g, "");
}

export function resolveWhatsappUser(from: string) {
  const id = BINDINGS[normalizeNumber(from)];
  return id ? userById(id) : null;
}

export interface InboundMessage {
  from: string;
  text: string;
  locale?: string;
}
export interface WhatsappReply {
  text: string;
  quickReplies: string[]; // ações do agente viram quick replies (botões)
  sources: CopilotReply["sources"];
}
export interface WhatsappResult {
  ok: boolean;
  bound: boolean;
  user: { name: string; role: string } | null;
  reply: WhatsappReply;
}

// Log do canal (auditoria — 0B §3). In-memory; em produção vai ao audit_log.
const WA_LOG: { at: string; from: string; userId: string; text: string }[] = [];
export function whatsappLogCount(): number {
  return WA_LOG.length;
}

export async function handleWhatsappMessage(input: InboundMessage): Promise<WhatsappResult> {
  const locale: Locale = input.locale && isLocale(input.locale) ? input.locale : "pt-BR";
  const user = resolveWhatsappUser(input.from);

  // 0B §3: nenhum comando é executado para número não vinculado.
  if (!user) {
    return {
      ok: false,
      bound: false,
      user: null,
      reply: { text: getT(locale, "whatsapp")("unbound"), quickReplies: [], sources: [] },
    };
  }

  const text = (input.text ?? "").slice(0, 4000);
  // WhatsApp é só mais um cliente do AI Core (0B §2): MESMO cérebro, tools e RAG,
  // isolado pelo tenant do usuário vinculado. As ações viram quick replies.
  const reply = await aiChat([{ role: "user", content: text }], locale, undefined, user.orgId);
  WA_LOG.push({ at: new Date().toISOString(), from: normalizeNumber(input.from), userId: user.sub, text });
  recordAiAction({ actor: `${user.name} (WhatsApp)`, action: "Comando WhatsApp", detail: text }); // 0B §3

  return {
    ok: true,
    bound: true,
    user: { name: user.name, role: user.role },
    reply: { text: reply.text, quickReplies: reply.actions.map((a) => a.label), sources: reply.sources },
  };
}

// Valida a assinatura do Meta (X-Hub-Signature-256: "sha256=<hex>"), tempo-constante.
export async function verifyWhatsappSignature(body: string, header: string, secret: string): Promise<boolean> {
  if (!header.startsWith("sha256=")) return false;
  const expected = header.slice(7);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// Extrai { from, text } tanto do shape simples do demo quanto do WhatsApp Cloud API.
export function extractInbound(body: unknown): InboundMessage | null {
  if (!body || typeof body !== "object") return null;
  const b = body as {
    from?: unknown; text?: unknown; locale?: unknown;
    entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ from?: unknown; text?: { body?: unknown } }> } }> }>;
  };
  if (typeof b.from === "string" && typeof b.text === "string") {
    return { from: b.from, text: b.text, locale: typeof b.locale === "string" ? b.locale : undefined };
  }
  const msg = b.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (msg && typeof msg.from === "string" && typeof msg.text?.body === "string") {
    return { from: "+" + msg.from.replace(/[^0-9]/g, ""), text: msg.text.body };
  }
  return null;
}
