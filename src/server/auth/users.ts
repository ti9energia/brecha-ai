// ─────────────────────────────────────────────────────────────────────────────
// Store de usuários (seedado). Senha = SHA-256(email + ":" + senha) em hex.
// Demo: a senha de todos é "demo1234". orgId fixo (single-tenant Acme).
// Em produção, trocar por Postgres + bcrypt/argon2 (mesma interface).
// ─────────────────────────────────────────────────────────────────────────────
import type { SessionUser } from "./session";

interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: SessionUser["role"];
  orgId: string;
  passwordHash: string; // sha256(email + ":" + password)
}

const USERS: StoredUser[] = [
  { id: "u-marina", email: "marina.alves@acme.com.br", name: "Marina Alves", role: "manager", orgId: "org-acme", passwordHash: "1852467bdc8d4e2c60a53ddfdc0731bfeec4483b3db2e511667375490df343a4" },
  { id: "u-helena", email: "helena.v@acme.com.br", name: "Helena Vasconcelos", role: "manager", orgId: "org-acme", passwordHash: "c8636599e4b7aa02f25b41b94a7403af89910da8afa085aed398856f3cdf8509" },
  { id: "u-owner", email: "owner@brecha.ai", name: "Dono da Plataforma", role: "platform_owner", orgId: "org-acme", passwordHash: "5501168e9c82fc127afe9c673cd5184d2be1e117ad286c5d5dd9b1db88f694f2" },
  { id: "u-rafael", email: "rafael.lima@acme.com.br", name: "Rafael Lima", role: "member", orgId: "org-acme", passwordHash: "836921278d450fee20a646638e51aa01d62ceb5eb253b5b0f6117fa1eceb1344" },
];

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Lookup por id — usado pelo vínculo número↔usuário do gateway WhatsApp (0B).
export function userById(id: string): Omit<SessionUser, "exp"> | null {
  const u = USERS.find((x) => x.id === id);
  return u ? { sub: u.id, email: u.email, name: u.name, role: u.role, orgId: u.orgId } : null;
}

// Lista global de usuários para o Painel do Dono (0C §2.3) — NUNCA expõe o hash.
export function listUsers(): { id: string; email: string; name: string; role: string; orgId: string }[] {
  return USERS.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, orgId: u.orgId }));
}

export async function authenticate(email: string, password: string): Promise<Omit<SessionUser, "exp"> | null> {
  const user = USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) return null;
  const hash = await sha256Hex(`${user.email}:${password}`);
  // comparação de tempo constante
  if (hash.length !== user.passwordHash.length) return null;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ user.passwordHash.charCodeAt(i);
  if (diff !== 0) return null;
  return { sub: user.id, email: user.email, name: user.name, role: user.role, orgId: user.orgId };
}
