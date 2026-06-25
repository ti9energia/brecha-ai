"use client";

import { useEffect, useRef, useState } from "react";
import { Keyboard, X } from "lucide-react";
import { useTranslations } from "@/i18n/provider";
import { useFocusTrap } from "@/ui/useFocusTrap";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-grid place-items-center min-w-6 h-6 px-1.5 rounded-[6px] border border-line bg-surface-3 mono text-[0.72rem] text-ink-2">
      {children}
    </kbd>
  );
}

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("nav");
  const [mod, setMod] = useState("Ctrl");
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent)) setMod("⌘");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const rows: { keys: React.ReactNode; label: string }[] = [
    { keys: <><Kbd>{mod}</Kbd><Kbd>K</Kbd></>, label: `${t("askCopilot")} / ${t("commandHint")}` },
    { keys: <><Kbd>{mod}</Kbd><Kbd>J</Kbd></>, label: t("toggleCopilot") },
    { keys: <><Kbd>{mod}</Kbd><Kbd>\</Kbd></>, label: `${t("splitRight")} / ${t("single")}` },
    { keys: <><Kbd>{mod}</Kbd><Kbd>/</Kbd></>, label: t("showShortcuts") },
    { keys: <Kbd>Esc</Kbd>, label: `${t("close")}` },
  ];

  const tabRows = [
    { keys: <Kbd>+</Kbd>, label: t("newTab") },
    { keys: <span className="mono text-[0.72rem] text-ink-3">{t("drag")}</span>, label: t("reorderTabs") },
    { keys: <span className="mono text-[0.72rem] text-ink-3">{t("middleClick")}</span>, label: t("closeTab") },
  ];

  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-rise" style={{ animationDuration: "0.2s" }} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("shortcuts")}
        className="relative w-full max-w-md glass rounded-[var(--radius-lg)] border border-line-strong shadow-[var(--shadow-lg)] overflow-hidden animate-rise"
        style={{ animationDuration: "0.25s" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-line">
          <span className="flex items-center gap-2.5 font-display font-semibold text-ink">
            <Keyboard size={18} className="text-brand" /> {t("shortcuts")}
          </span>
          <button onClick={onClose} className="grid place-items-center size-8 rounded-[var(--radius-sm)] text-ink-3 hover:text-ink hover:bg-surface-3 transition-colors">
            <X size={17} />
          </button>
        </div>
        <div className="p-5 space-y-1">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-ink-2">{r.label}</span>
              <span className="flex items-center gap-1">{r.keys}</span>
            </div>
          ))}
          <div className="my-3 h-px bg-[color:var(--border)]" />
          <p className="eyebrow mb-1">{t("tabs")}</p>
          {tabRows.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-ink-2">{r.label}</span>
              <span className="flex items-center gap-1">{r.keys}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
