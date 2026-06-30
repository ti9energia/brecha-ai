// ─────────────────────────────────────────────────────────────────────────────
// Store de usuários (seedado). Senha = SHA-256(email + ":" + senha) em hex.
// Demo: a senha de todos é "demo1234". orgId fixo (single-tenant Acme).
// Em produção, trocar por Postgres + bcrypt/argon2 (mesma interface).
// ─────────────────────────────────────────────────────────────────────────────
import type { SessionUser, AccountType } from "./session";

interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: SessionUser["role"];
  orgId: string;
  accountType: AccountType; // perfil do produto (autônomo/escritório/dono)
  passwordHash: string; // sha256(email + ":" + password)
  blocked: boolean; // bloquear acesso sem apagar o usuário (0C §2.3)
}

const USERS: StoredUser[] = [
  // Autônomo (empresa que se autoavalia) — org Acme.
  { id: "u-marina", email: "marina.alves@acme.com.br", name: "Marina Alves", role: "manager", orgId: "org-acme", accountType: "company", blocked: false, passwordHash: "1852467bdc8d4e2c60a53ddfdc0731bfeec4483b3db2e511667375490df343a4" },
  { id: "u-helena", email: "helena.v@acme.com.br", name: "Helena Vasconcelos", role: "manager", orgId: "org-acme", accountType: "company", blocked: false, passwordHash: "c8636599e4b7aa02f25b41b94a7403af89910da8afa085aed398856f3cdf8509" },
  { id: "u-rafael", email: "rafael.lima@acme.com.br", name: "Rafael Lima", role: "member", orgId: "org-acme", accountType: "company", blocked: false, passwordHash: "836921278d450fee20a646638e51aa01d62ceb5eb253b5b0f6117fa1eceb1344" },
  // Escritório / advogado (gere uma carteira de clientes) — org do escritório.
  { id: "u-silva", email: "dra.silva@silvaadvogados.com.br", name: "Dra. Beatriz Silva", role: "tributarista", orgId: "org-silva-adv", accountType: "firm", blocked: false, passwordHash: "83f7c47e9d5c1ada6963be1c3ded8c6e2da2db1f0d0749c3c034deced07b63a1" },
  // Dono do SaaS (governança da plataforma).
  { id: "u-owner", email: "owner@brecha.ai", name: "Dono da Plataforma", role: "platform_owner", orgId: "org-acme", accountType: "owner", blocked: false, passwordHash: "5501168e9c82fc127afe9c673cd5184d2be1e117ad286c5d5dd9b1db88f694f2" },
  // Equipe interna da plataforma.
  { id: "u-staff-ops", email: "ops@brecha.ai", name: "Equipe Ops", role: "platform_staff", orgId: "org-acme", accountType: "owner", blocked: false, passwordHash: "5501168e9c82fc127afe9c673cd5184d2be1e117ad286c5d5dd9b1db88f694f2" },
  { id: "u-support", email: "suporte@brecha.ai", name: "Suporte Brecha.ai", role: "platform_support", orgId: "org-acme", accountType: "owner", blocked: false, passwordHash: "5501168e9c82fc127afe9c673cd5184d2be1e117ad286c5d5dd9b1db88f694f2" },
];

let userSeq = USERS.length;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Lookups ────────────────────────────────────────────────────────────────────

// Lookup por id — usado pelo vínculo número↔usuário do gateway WhatsApp (0B).
export function userById(id: string): Omit<SessionUser, "exp"> | null {
  const u = USERS.find((x) => x.id === id);
  if (!u || u.blocked) return null;
  return { sub: u.id, email: u.email, name: u.name, role: u.role, orgId: u.orgId, accountType: u.accountType };
}

// Lista global de usuários para o Painel do Dono (0C §2.3) — NUNCA expõe o hash.
export function listUsers(): { id: string; email: string; name: string; role: string; orgId: string; blocked: boolean }[] {
  return USERS.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, orgId: u.orgId, blocked: u.blocked }));
}

// ── CRUD (0C §2.3) ─────────────────────────────────────────────────────────────

export interface CreateUserInput {
  email: string;
  name: string;
  role: SessionUser["role"];
  orgId: string;
  accountType?: AccountType;
  password?: string; // gerada se omitida
}

export async function createUser(
  input: CreateUserInput,
): Promise<{ id: string; email: string; name: string; role: string; orgId: string; blocked: boolean } | null> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.name.trim()) return null;
  // Idempotência: não duplicar e-mail.
  if (USERS.find((u) => u.email === email)) return null;
  const password = input.password ?? "Brecha2026!"; // senha provisória — trocar no primeiro login
  const hash = await sha256Hex(`${email}:${password}`);
  const u: StoredUser = {
    id: `u-${++userSeq}`,
    email,
    name: input.name.trim().slice(0, 80),
    role: input.role,
    orgId: input.orgId,
    accountType: input.accountType ?? "company",
    blocked: false,
    passwordHash: hash,
  };
  USERS.push(u);
  return { id: u.id, email: u.email, name: u.name, role: u.role, orgId: u.orgId, blocked: u.blocked };
}

export interface UpdateUserInput {
  role?: SessionUser["role"];
  blocked?: boolean;
  name?: string;
}

export function updateUser(
  id: string,
  patch: UpdateUserInput,
): { id: string; email: string; name: string; role: string; orgId: string; blocked: boolean } | null {
  const u = USERS.find((x) => x.id === id);
  if (!u) return null;
  if (patch.role !== undefined) u.role = patch.role;
  if (patch.blocked !== undefined) u.blocked = patch.blocked;
  if (typeof patch.name === "string" && patch.name.trim()) u.name = patch.name.trim().slice(0, 80);
  return { id: u.id, email: u.email, name: u.name, role: u.role, orgId: u.orgId, blocked: u.blocked };
}

// ── Autenticação ───────────────────────────────────────────────────────────────

export async function authenticate(email: string, password: string): Promise<Omit<SessionUser, "exp"> | null> {
  const user = USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) return null;
  if (user.blocked) return null; // bloqueado → acesso negado
  const hash = await sha256Hex(`${user.email}:${password}`);
  // comparação de tempo constante
  if (hash.length !== user.passwordHash.length) return null;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ user.passwordHash.charCodeAt(i);
  if (diff !== 0) return null;
  return { sub: user.id, email: user.email, name: user.name, role: user.role, orgId: user.orgId, accountType: user.accountType };
}
