import { listFlags, setFlag } from "@/server/domain/store";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET /api/owner/flags — lista os feature flags da plataforma (0C §2.6).
export async function GET(req: Request) {
  const limited = await rateLimit(req, "owner-flags", { max: 60, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("platform_owner", "platform_staff");
  if (gate.error) return gate.error;
  return ok(listFlags());
}

// PATCH /api/owner/flags — persiste o estado de um flag (on/off). platform_owner only.
export async function PATCH(req: Request) {
  const limited = await rateLimit(req, "owner-flags-write", { max: 30, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const { module, enabled } = body;
  if (typeof module !== "string" || typeof enabled !== "boolean") {
    return fail("INVALID_INPUT", "errors.invalid_input", 400);
  }
  const updated = setFlag(module, enabled);
  if (!updated) return fail("FLAG_NOT_FOUND", "errors.not_found", 404);
  return ok(updated, { updated: true });
}
