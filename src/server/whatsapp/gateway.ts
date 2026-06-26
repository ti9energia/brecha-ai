// ─────────────────────────────────────────────────────────────────────────────
// Gateway WhatsApp (0B) — traduz WhatsApp ⇄ AI Core. SEM lógica de negócio: só
// resolve o usuário pelo número (vínculo/opt-in), repassa ao MESMO cérebro do
// copiloto (domainBrain) e formata a resposta. Permissão-aware via o papel do
// usuário vinculado; toda mensagem é registrada (auditoria). Um provider real
// (Meta Cloud API / Twilio) apenas encaminha o webhook para cá.
// ─────────────────────────────────────────────────────────────────────────────
import { aiChat, invokeTool } from "@/server/ai-core";
import { agentRun } from "@/server/ai-core/agent";
import type { CopilotReply } from "@/server/ai/brain";
import { userById } from "@/server/auth/users";
import { recordAiAction, listOpportunities, orgEntitlements, isModuleEntitled } from "@/server/domain/store";
import { getT } from "@/i18n/server";
import { isLocale, type Locale } from "@/i18n/config";

// Vínculo número↔usuário. Seed (demo) + vínculos DINÂMICOS confirmados via opt-in.
const BINDINGS: Record<string, string> = {
  "+5511999990000": "u-marina", // CFO (manager)
  "+5511988887777": "u-helena", // tributarista (manager)
};
const DYNAMIC_BINDINGS: Record<string, string> = {}; // número→userId (opt-ins confirmados)

function normalizeNumber(n: string): string {
  const trimmed = n.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/[^0-9]/g, "");
}

export function resolveWhatsappUser(from: string) {
  const numKey = normalizeNumber(from);
  const id = DYNAMIC_BINDINGS[numKey] ?? BINDINGS[numKey];
  return id ? userById(id) : null;
}

// ── Opt-in com verificação por código (0B §3 DoD a) ────────────────────────────
// O usuário (logado no app) pede para vincular um número e recebe um código (em
// produção, enviado por WhatsApp/SMS). Ao responder o código PELO WhatsApp, o número
// passa a ser vinculado à conta. Sem opt-in confirmado, nenhum comando é executado.
interface PendingOptIn {
  code: string;
  userId: string;
}
const OPTIN: Record<string, PendingOptIn> = {};
let optInSeq = 481_900;
function genCode(): string {
  optInSeq = (optInSeq + 31_337) % 1_000_000;
  return String(optInSeq).padStart(6, "0");
}

export function requestWhatsappOptIn(userId: string, number: string): { number: string; code: string } {
  const numKey = normalizeNumber(number);
  const code = genCode();
  OPTIN[numKey] = { code, userId };
  recordAiAction({ actor: userId, action: "WhatsApp opt-in solicitado", detail: numKey });
  return { number: numKey, code };
}

export function confirmWhatsappOptIn(number: string, code: string): { sub: string; name: string; role: string } | null {
  const numKey = normalizeNumber(number);
  const pending = OPTIN[numKey];
  if (!pending || pending.code !== code.trim()) return null;
  DYNAMIC_BINDINGS[numKey] = pending.userId;
  delete OPTIN[numKey];
  recordAiAction({ actor: pending.userId, action: "WhatsApp vinculado (opt-in)", detail: numKey });
  const u = userById(pending.userId);
  return u ? { sub: u.sub, name: u.name, role: u.role } : null;
}

// ── Confirmação de ação sensível (0B §8c: "responda SIM") ──────────────────────
// Ações que mutam (aprovar execução) NUNCA rodam direto: o gateway guarda a intenção
// por número e só executa após um SIM. Em produção, persistir com TTL.
interface PendingAction {
  tool: string;
  input: Record<string, unknown>;
  label: string;
}
const PENDING: Record<string, PendingAction> = {};
export function pendingConfirmCount(): number {
  return Object.keys(PENDING).length;
}

const CONFIRM = ["sim", "yes", "y", "oui", "ok", "是", "确认"];
const CANCEL = ["não", "nao", "no", "non", "否", "取消"];
const APPROVE_KW = ["aprov", "approve", "approuv", "批准"];

function firstToken(text: string): string {
  return text.trim().toLowerCase().split(/[\s,，。.!！?？]+/)[0] ?? "";
}
function isOneOf(text: string, words: string[]): boolean {
  const t = text.trim().toLowerCase();
  return words.includes(firstToken(text)) || words.includes(t);
}
function wantsApprove(text: string): boolean {
  const t = text.toLowerCase();
  return APPROVE_KW.some((k) => t.includes(k));
}

export interface InboundMessage {
  from: string;
  text: string;
  locale?: string;
  media?: { kind: "audio" | "image" | "document"; filename?: string };
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
  const tw = getT(locale, "whatsapp");

  // 0B §3: número não vinculado. Se a mensagem for o CÓDIGO de um opt-in pendente,
  // confirma o vínculo (verificação por código); senão, recusa sem executar nada.
  if (!user) {
    const confirmed = confirmWhatsappOptIn(input.from, (input.text ?? "").trim());
    if (confirmed) {
      return { ok: true, bound: true, user: { name: confirmed.name, role: confirmed.role }, reply: { text: tw("optinConfirmed"), quickReplies: [], sources: [] } };
    }
    return { ok: false, bound: false, user: null, reply: { text: tw("unbound"), quickReplies: [], sources: [] } };
  }

  const text = (input.text ?? "").slice(0, 4000);
  const numKey = normalizeNumber(input.from);
  const who = { name: user.name, role: user.role };
  const done = (replyText: string, quickReplies: string[] = [], sources: CopilotReply["sources"] = []): WhatsappResult => {
    WA_LOG.push({ at: new Date().toISOString(), from: numKey, userId: user.sub, text });
    return { ok: true, bound: true, user: who, reply: { text: replyText, quickReplies, sources } };
  };

  // ── 0B §8(h): o canal WhatsApp pode ser desligado pelo PLANO do tenant ──
  if (!isModuleEntitled("whatsapp", orgEntitlements(user.orgId))) {
    return done(tw("channelNotInPlan"));
  }

  // ── 0B §4: mídia (áudio/imagem/PDF). Sem caption, a transcrição automática é um
  // passo de produção (SWAP) — reconhece e orienta; com caption, segue como comando ──
  if (input.media && !text.trim()) {
    recordAiAction({ actor: `${user.name} (WhatsApp)`, action: "Mídia recebida", detail: input.media.kind });
    return done(tw("mediaReceived", { kind: input.media.kind }));
  }

  // ── 0B §8(c): há uma ação aguardando confirmação? SIM executa, NÃO cancela ──
  const pending = PENDING[numKey];
  if (pending && isOneOf(text, CONFIRM)) {
    delete PENDING[numKey];
    const res = invokeTool(pending.tool, pending.input, {
      role: user.role, userName: `${user.name} (WhatsApp)`, entitlements: orgEntitlements(user.orgId),
    });
    recordAiAction({ actor: `${user.name} (WhatsApp)`, action: "Confirmação WhatsApp", detail: `SIM → ${pending.label}` });
    return done(res.ok ? tw("confirmed", { title: pending.label }) : tw("nothingPending"));
  }
  if (pending && isOneOf(text, CANCEL)) {
    delete PENDING[numKey];
    recordAiAction({ actor: `${user.name} (WhatsApp)`, action: "Confirmação WhatsApp", detail: `cancelado → ${pending.label}` });
    return done(tw("cancelled"));
  }

  // ── Intenção de aprovar execução → NÃO executa: registra pendência e pede SIM ──
  if (wantsApprove(text)) {
    const target = listOpportunities({ status: "all" }).find((o) => o.status === "pending_approval");
    if (!target) return done(tw("nothingPending"));
    PENDING[numKey] = { tool: "execution:start", input: { opportunityId: target.id }, label: target.title };
    recordAiAction({ actor: `${user.name} (WhatsApp)`, action: "Confirmação solicitada", detail: target.title });
    return done(tw("confirmPrompt", { title: target.title }), [tw("confirmYes"), tw("confirmNo")]);
  }

  // ── Fluxo normal: mesmo cérebro/tools/RAG do copiloto, isolado pelo tenant (0B §2) ──
  const reply = await aiChat([{ role: "user", content: text }], locale, undefined, user.orgId);
  recordAiAction({ actor: `${user.name} (WhatsApp)`, action: "Comando WhatsApp", detail: text }); // 0B §3
  return done(reply.text, reply.actions.map((a) => a.label), reply.sources);
}

// ── Saída (0B §7) ────────────────────────────────────────────────────────────
const SENT_LOG: { at: string; to: string; text: string }[] = [];

export function sendWhatsapp(to: string, text: string): { ok: boolean; to: string } {
  // SWAP (produção): POST na API do Meta/Twilio (/whatsapp/send), respeitando
  // janelas/templates do WhatsApp Business. No demo, registra o envio.
  const dest = normalizeNumber(to);
  SENT_LOG.push({ at: new Date().toISOString(), to: dest, text: text.slice(0, 4000) });
  return { ok: true, to: dest };
}
export function sentWhatsappCount(): number {
  return SENT_LOG.length;
}

// Push proativo do Agente (0B §4): roda o agente e envia os alertas urgentes ao
// número vinculado. Em produção, é um job agendado (0A §4 "agendado").
export function agentProactivePush(to: string): { pushed: number } {
  const urgent = agentRun().filter((r) => r.kind === "window_closing");
  for (const r of urgent) sendWhatsapp(to, `⚠️ ${r.title}\n${r.body}`);
  return { pushed: urgent.length };
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

// Extrai { from, text, media } do shape simples do demo OU do WhatsApp Cloud API
// (texto + mídia: áudio/imagem/documento — 0B §4). Caption vira o texto.
export function extractInbound(body: unknown): InboundMessage | null {
  if (!body || typeof body !== "object") return null;
  const b = body as {
    from?: unknown; text?: unknown; locale?: unknown;
    entry?: Array<{ changes?: Array<{ value?: { messages?: Array<Record<string, unknown>> } }> }>;
  };
  if (typeof b.from === "string" && typeof b.text === "string") {
    return { from: b.from, text: b.text, locale: typeof b.locale === "string" ? b.locale : undefined };
  }
  const msg = b.entry?.[0]?.changes?.[0]?.value?.messages?.[0] as
    | { from?: unknown; type?: unknown; text?: { body?: unknown }; image?: { caption?: unknown }; document?: { caption?: unknown; filename?: unknown } }
    | undefined;
  if (!msg || typeof msg.from !== "string") return null;
  const from = "+" + msg.from.replace(/[^0-9]/g, "");
  if (typeof msg.text?.body === "string") return { from, text: msg.text.body };
  if (msg.type === "audio") return { from, text: "", media: { kind: "audio" } };
  if (msg.type === "image") return { from, text: typeof msg.image?.caption === "string" ? msg.image.caption : "", media: { kind: "image" } };
  if (msg.type === "document") {
    return { from, text: typeof msg.document?.caption === "string" ? msg.document.caption : "", media: { kind: "document", filename: typeof msg.document?.filename === "string" ? msg.document.filename : undefined } };
  }
  return null;
}
