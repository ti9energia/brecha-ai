import { getSystemSettings, updateSystemSettings } from "@/server/domain/store";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET /api/owner/system — lê as configurações globais da plataforma (função 12, 0C §2.11).
export async function GET(req: Request) {
  const limited = rateLimit(req, "owner-system", { max: 60, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("platform_owner", "platform_staff");
  if (gate.error) return gate.error;
  return ok(getSystemSettings());
}

// PATCH /api/owner/system — atualiza as configurações globais. platform_owner only.
export async function PATCH(req: Request) {
  const limited = rateLimit(req, "owner-system-write", { max: 20, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!body || typeof body !== "object") return fail("INVALID_INPUT", "errors.invalid_input", 400);
  const updated = updateSystemSettings(body as Parameters<typeof updateSystemSettings>[0]);
  return ok(updated, { updated: true });
}
