"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, FlaskConical, ShieldCheck, Coins, Command, Sparkles, X, ArrowRight } from "lucide-react";
import { useTranslations } from "@/i18n/provider";
import { useSession } from "./session";
import { useFocusTrap } from "@/ui/useFocusTrap";
import { Mark } from "@/ui/Logo";
import { buttonClass } from "@/ui/primitives";

const STORAGE_KEY = "brecha-onboarded-v1";

// Overlay de boas-vindas: orienta o funil (janela → simular → aprovar → economia)
// e aponta os atalhos. Auto-abre no primeiro acesso (persistido em localStorage) e
// é reabrível pelo botão "guia" (via `openSignal`, um contador que incrementa).
export function Onboarding({ openSignal }: { openSignal: number }) {
  const t = useTranslations("onboarding");
  const user = useSession();
  const [open, setOpen] = useState(false);
  const [mod, setMod] = useState("Ctrl");
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent)) setMod("⌘");
  }, []);

  // Primeiro acesso → abre automaticamente.
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      /* modo privado — sem auto-open */
    }
  }, []);

  // Reabertura sob demanda (botão "guia de boas-vindas").
  useEffect(() => {
    if (openSignal > 0) setOpen(true);
  }, [openSignal]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!open) return null;

  const firstName = user.name.split(" ")[0] || user.name;
  const combo = (k: string) => (mod === "⌘" ? `⌘${k}` : `Ctrl+${k}`);
  const steps = [
    { icon: <Crosshair size={16} />, title: t("step1Title"), body: t("step1Body") },
    { icon: <FlaskConical size={16} />, title: t("step2Title"), body: t("step2Body") },
    { icon: <ShieldCheck size={16} />, title: t("step3Title"), body: t("step3Body") },
    { icon: <Coins size={16} />, title: t("step4Title"), body: t("step4Body") },
  ];

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" onMouseDown={dismiss}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-rise" style={{ animationDuration: "0.2s" }} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("title", { name: firstName })}
        className="relative w-full max-w-lg glass rounded-[var(--radius-lg)] border border-line-gold shadow-[var(--shadow-lg)] overflow-hidden animate-rise"
        style={{ animationDuration: "0.28s" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="relative px-6 pt-6 pb-5 border-b border-line">
          <button
            onClick={dismiss}
            aria-label={t("skip")}
            className="absolute right-4 top-4 grid place-items-center size-8 rounded-[var(--radius-sm)] text-ink-3 hover:text-ink hover:bg-surface-3 transition-colors"
          >
            <X size={17} />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <span className="grid place-items-center size-11 rounded-full bg-surface-3 border border-line-gold shrink-0">
              <Mark size={22} />
            </span>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-xl text-ink leading-tight text-balance">{t("title", { name: firstName })}</h2>
              <p className="mt-0.5 text-sm text-ink-3 text-pretty">{t("subtitle")}</p>
            </div>
          </div>
        </div>

        {/* passos do funil */}
        <div className="p-6 space-y-3.5">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3.5">
              <span className="relative grid place-items-center size-9 rounded-[var(--radius-md)] border border-line-gold bg-[var(--brand-soft)] text-brand shrink-0">
                {s.icon}
                <span className="absolute -top-1.5 -left-1.5 grid place-items-center size-5 rounded-full bg-brand text-on-brand mono text-[0.6rem] font-bold">{i + 1}</span>
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-display font-semibold text-ink leading-tight">{s.title}</p>
                <p className="mt-0.5 text-sm text-ink-3 text-pretty">{s.body}</p>
              </div>
            </div>
          ))}

          {/* dicas de atalho */}
          <div className="mt-2 pt-4 border-t border-line space-y-2 text-xs text-ink-3">
            <p className="inline-flex items-center gap-2"><Command size={12} className="text-brand shrink-0" /> {t("tipCommand", { kbd: combo("K") })}</p>
            <p className="flex items-center gap-2"><Sparkles size={12} className="text-brand shrink-0" /> {t("tipCopilot", { kbd: combo("J") })}</p>
          </div>
        </div>

        {/* rodapé */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-line bg-surface-2">
          <button onClick={dismiss} className={buttonClass("ghost", "md")}>{t("skip")}</button>
          <button onClick={dismiss} className={buttonClass("primary", "md", "group")}>
            {t("start")} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
