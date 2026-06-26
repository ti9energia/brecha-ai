"use client";

import { useEffect } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { buttonClass } from "@/ui/primitives";
import { useTranslations } from "@/i18n/provider";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPages");

  useEffect(() => {
    // Em produção, enviar para o Sentry/observabilidade.
    console.error("[brecha] erro de runtime:", error);
  }, [error]);

  return (
    <main className="relative min-h-dvh grid place-items-center overflow-hidden px-6">
      <div className="aurora opacity-40" />
      <div className="relative text-center max-w-md">
        <span className="mx-auto mb-7 grid place-items-center size-16 rounded-full border border-[color:var(--danger)]/30 bg-[var(--danger-soft)] text-danger">
          <AlertTriangle size={26} />
        </span>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink text-balance">{t("errorTitle")}</h1>
        <p className="mt-4 text-ink-3 text-pretty">{t("errorBody")}</p>
        {error.digest && <p className="mt-3 mono text-xs text-ink-4">ref: {error.digest}</p>}
        <button onClick={reset} className={buttonClass("primary", "lg", "mt-8 group")}>
          <RotateCcw size={16} className="transition-transform group-hover:-rotate-45" />
          {t("tryAgain")}
        </button>
      </div>
    </main>
  );
}
