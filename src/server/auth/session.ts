// ─────────────────────────────────────────────────────────────────────────────
// Sessão — JWT HS256 assinado via Web Crypto (funciona no Edge middleware E no
// runtime Node das rotas). Sem dependências. Cookie HttpOnly + SameSite + Secure.
// ─────────────────────────────────────────────────────────────────────────────

export const SESSION_COOKIE = "brecha_session";
const SESSION_TTL = 60 * 60 * 8; // 8h

export interface SessionUser {
  sub: string; // user id
  email: string;
  name: string;
  role: "platform_owner" | "org_admin" | "manager" | "member" | "viewer";
  orgId: string;
  exp: number;
}

function secret(): string {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv) return fromEnv;
  // Fail-closed: nunca assinar sessões com um segredo público em produção — qualquer
  // um que leia o repositório poderia forjar uma sessão platform_owner. Em produção
  // AUTH_SECRET é obrigatório (ver .env.example).
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET é obrigatório em produção — defina uma chave aleatória de 32+ caracteres.");
  }
  return "brecha-dev-secret-troque-em-producao-32+chars";
}

// base64url (isomórfico Edge/Node)
function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlEncodeStr(str: string): string {
  return b64urlEncode(new TextEncoder().encode(str));
}
function b64urlDecodeStr(b64: string): string {
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

export async function signSession(payload: Omit<SessionUser, "exp">): Promise<string> {
  const header = b64urlEncodeStr(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64urlEncodeStr(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_TTL }),
  );
  const data = `${header}.${body}`;
  const sig = await hmac(data);
  return `${data}.${sig}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = await hmac(`${header}.${body}`);
  // comparação de tempo constante
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(b64urlDecodeStr(body)) as SessionUser;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL,
};
