"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Mail, Lock, KeyRound, ShieldCheck, AlertCircle, Building2, Briefcase, Crown } from "lucide-react";
import { useTranslations, useLocale } from "@/i18n/provider";
import { buttonClass } from "@/ui/primitives";
import { cn } from "@/ui/cn";

// Os 3 perfis (00 §0C + perfis de produto). Cada um é uma conta-demo distinta — o
// accountType vem do usuário no servidor (não do cliente), então é a fonte da verdade.
const DEMOS = {
  company: { email: "marina.alves@acme.com.br", password: "demo1234" },
  firm: { email: "dra.silva@silvaadvogados.com.br", password: "demo1234" },
  owner: { email: "owner@brecha.ai", password: "demo1234" },
} as const;
type Persona = keyof typeof DEMOS;
const DEMO = DEMOS.company; // retrocompat (default = autônomo)

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  // Só aceita destino relativo same-origin (começa com "/" mas não "//"): impede
  // open-redirect via ?next=https://… ou ?next=//evil.com.
  const rawNext = params.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : `/${locale}/app`;

  const [persona, setPersona] = useState<Persona>("company");
  const [email, setEmail] = useState<string>(DEMO.email);
  const [password, setPassword] = useState<string>(DEMO.password);
  const [loading, setLoading] = useState<null | "form" | "google" | "magic">(null);
  const [forgot, setForgot] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escolher um perfil pré-preenche a conta-demo e entra direto (um clique).
  function pick(p: Persona) {
    setPersona(p);
    setEmail(DEMOS[p].email);
    setPassword(DEMOS[p].password);
    login(DEMOS[p].email, DEMOS[p].password, "form");
  }
  const PERSONAS: { id: Persona; icon: typeof Building2; label: string; desc: string }[] = [
    { id: "company", icon: Building2, label: t("personaCompany"), desc: t("personaCompanyDesc") },
    { id: "firm", icon: Briefcase, label: t("personaFirm"), desc: t("personaFirmDesc") },
    { id: "owner", icon: Crown, label: t("personaOwner"), desc: t("personaOwnerDesc") },
  ];

  async function login(em: string, pw: string, kind: NonNullable<typeof loading>) {
    setError(null);
    setLoading(kind);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: em, password: pw }),
      });
      if (res.ok) {
        router.push(next);
        router.refresh();
        return;
      }
      const json = await res.json().catch(() => null);
      setError(json?.error?.code === "RATE_LIMITED" ? t("rateLimited") : t("invalidCreds"));
    } catch {
      setError(t("invalidCreds"));
    }
    setLoading(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    login(email, password, "form");
  }

  return (
    <div className="w-full max-w-sm">
      {/* Seletor de perfil — entra direto no contexto certo (autônomo/escritório/dono). */}
      <div className="mb-5">
        <p className="text-xs font-medium text-ink-2 mb-2">{t("chooseProfile")}</p>
        <div className="grid grid-cols-3 gap-2">
          {PERSONAS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => pick(id)}
              disabled={!!loading}
              aria-pressed={persona === id}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] border px-2 py-3 text-center transition-colors disabled:opacity-60",
                persona === id ? "border-line-gold bg-[var(--brand-soft)] text-brand" : "border-line bg-surface-2 text-ink-3 hover:text-ink hover:border-line-strong",
              )}
            >
              <Icon size={18} />
              <span className="text-[0.7rem] font-medium leading-tight text-pretty">{label}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[0.7rem] text-ink-4 text-center">{PERSONAS.find((p) => p.id === persona)?.desc}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field icon={<Mail size={15} />} label={t("email")}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className="login-input"
            autoComplete="email"
          />
        </Field>
        <Field
          icon={<Lock size={15} />}
          label={t("password")}
          aside={
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch("/api/auth/forgot", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ email }),
                  });
                } catch {
                  /* anti-enumeração: a UI não revela falha */
                }
                setForgot(true);
              }}
              className="text-xs text-ink-4 hover:text-brand transition-colors"
            >
              {t("forgot")}
            </button>
          }
        >
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            className="login-input"
            autoComplete="current-password"
          />
        </Field>

        {forgot && (
          <p className="flex items-start gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2.5 text-xs text-ink-3 animate-rise">
            <Mail size={13} className="text-brand shrink-0 mt-0.5" /> {t("forgotSent")}
          </p>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[color:var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2.5 text-xs text-danger animate-rise">
            <AlertCircle size={13} className="shrink-0 mt-0.5" /> {error}
          </p>
        )}

        <button type="submit" disabled={!!loading} className={buttonClass("primary", "lg", "w-full group mt-2")}>
          {loading === "form" ? (
            <><Loader2 size={17} className="animate-spin" /> {t("signingIn")}</>
          ) : (
            <>{t("signIn")} <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-[color:var(--border)]" />
        <span className="mono text-[0.7rem] uppercase tracking-widest text-ink-4">{t("or")}</span>
        <span className="h-px flex-1 bg-[color:var(--border)]" />
      </div>

      <div className="space-y-2.5">
        <button onClick={() => login(DEMOS[persona].email, DEMOS[persona].password, "google")} disabled={!!loading} className={buttonClass("secondary", "md", "w-full")}>
          {loading === "google" ? <Loader2 size={16} className="animate-spin" /> : <GoogleGlyph />}
          {t("google")}
        </button>
        <button onClick={() => login(DEMOS[persona].email, DEMOS[persona].password, "magic")} disabled={!!loading} className={buttonClass("ghost", "md", "w-full")}>
          {loading === "magic" ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} className="text-brand" />}
          {t("magic")}
        </button>
      </div>

      <div className="mt-7 flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2.5">
        <ShieldCheck size={14} className="text-positive" />
        <span className="text-xs text-ink-3">{t("demoHint")}</span>
      </div>

      <p className="mt-6 text-center text-sm text-ink-3">
        {t("noAccount")}{" "}
        <a href={`/${locale}#pricing`} className="text-brand hover:underline">{t("talkSales")}</a>
      </p>
    </div>
  );
}

function Field({
  icon, label, aside, children,
}: {
  icon: React.ReactNode;
  label: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-ink-2">{label}</span>
        {aside}
      </span>
      <span className={cn("relative flex items-center")}>
        <span className="absolute left-3 text-ink-4">{icon}</span>
        {children}
      </span>
    </label>
  );
}
