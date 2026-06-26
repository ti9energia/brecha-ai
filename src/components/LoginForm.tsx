"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Mail, Lock, KeyRound, ShieldCheck, AlertCircle } from "lucide-react";
import { useTranslations, useLocale } from "@/i18n/provider";
import { buttonClass } from "@/ui/primitives";
import { cn } from "@/ui/cn";

const DEMO = { email: "marina.alves@acme.com.br", password: "demo1234" };

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
  const next = params.get("next") || `/${locale}/app`;

  const [email, setEmail] = useState(DEMO.email);
  const [password, setPassword] = useState(DEMO.password);
  const [loading, setLoading] = useState<null | "form" | "google" | "magic">(null);
  const [forgot, setForgot] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <button onClick={() => login(DEMO.email, DEMO.password, "google")} disabled={!!loading} className={buttonClass("secondary", "md", "w-full")}>
          {loading === "google" ? <Loader2 size={16} className="animate-spin" /> : <GoogleGlyph />}
          {t("google")}
        </button>
        <button onClick={() => login(DEMO.email, DEMO.password, "magic")} disabled={!!loading} className={buttonClass("ghost", "md", "w-full")}>
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
