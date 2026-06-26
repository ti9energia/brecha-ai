import { getLandingContent, updateLandingContent } from "@/server/domain/store";
import { isLocale } from "@/i18n/config";
import { ok, fail } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { rateLimit } from "@/server/security/rateLimit";

// GET/PUT /api/owner/landing (0C §2.5) — CMS da landing por locale. platform_owner.
export async function GET(req: Request) {
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;
  const locale = new URL(req.url).searchParams.get("locale");
  if (!locale || !isLocale(locale)) return fail("INVALID_LOCALE", "errors.missing_params");
  return ok(getLandingContent(locale));
}

export async function PUT(req: Request) {
  const limited = rateLimit(req, "owner-landing", { max: 30, windowMs: 60_000 });
  if (limited) return limited;
  const gate = await requireRole("platform_owner");
  if (gate.error) return gate.error;

  const body = await req.json().catch(() => ({}));
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const locale = typeof b.locale === "string" && isLocale(b.locale) ? b.locale : null;
  if (!locale) return fail("INVALID_LOCALE", "errors.missing_params");
  const saved = updateLandingContent(locale, b);
  return ok(saved, { saved: true });
}
