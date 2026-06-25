"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles, CornerDownLeft, SplitSquareHorizontal, Maximize2, ArrowRight } from "lucide-react";
import { useWorkspace, type ModuleId } from "./store";
import { useSession } from "./session";
import { MODULES } from "./registry";
import { useCopilot } from "@/components/Copilot";
import { useTranslations } from "@/i18n/provider";
import { useFocusTrap } from "@/ui/useFocusTrap";
import { cn } from "@/ui/cn";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  kind: "module" | "action" | "ask";
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
  targetPaneId,
}: {
  open: boolean;
  onClose: () => void;
  targetPaneId?: string;
}) {
  const ws = useWorkspace();
  const user = useSession();
  const copilot = useCopilot();
  const tNav = useTranslations("nav");
  const canOwner = user.role === "platform_owner";
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSel(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const base: Cmd[] = useMemo(() => {
    const mods: Cmd[] = MODULES.filter((m) => !m.railHidden && (m.id !== "owner" || canOwner)).map((m) => {
      const Icon = m.icon;
      return {
        id: `open-${m.id}`,
        label: tNav(m.navKey),
        hint: tNav(m.group),
        icon: <Icon size={16} />,
        kind: "module",
        run: () => { ws.open(m.id as ModuleId, undefined, undefined, targetPaneId); onClose(); },
      };
    });
    const actions: Cmd[] = [
      { id: "split", label: tNav("splitRight"), icon: <SplitSquareHorizontal size={16} />, kind: "action", run: () => { ws.split("split-v"); onClose(); } },
      { id: "single", label: tNav("single"), icon: <Maximize2 size={15} />, kind: "action", run: () => { ws.unsplit(); onClose(); } },
    ];
    return [...mods, ...actions];
  }, [tNav, ws, targetPaneId, onClose, canOwner]);

  const items: Cmd[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? base.filter((c) => c.label.toLowerCase().includes(q)) : base;
    if (q) {
      filtered.unshift({
        id: "ask",
        label: `${tNav("askCopilot")}: "${query}"`,
        icon: <Sparkles size={16} className="text-brand" />,
        kind: "ask",
        run: () => { copilot.ask(query); onClose(); },
      });
    }
    return filtered;
  }, [query, base, copilot, onClose, tNav]);

  useEffect(() => { setSel(0); }, [query]);

  if (!open) return null;

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); items[sel]?.run(); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] px-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-rise" style={{ animationDuration: "0.2s" }} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={tNav("askCopilot")}
        className="relative w-full max-w-xl glass rounded-[var(--radius-lg)] border border-line-strong shadow-[var(--shadow-lg)] overflow-hidden animate-rise"
        style={{ animationDuration: "0.25s" }}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKey}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-line">
          <Search size={18} className="text-ink-4" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${tNav("askCopilot")} ${tNav("commandHint")}…`}
            className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-4"
          />
          <kbd className="mono text-[0.65rem] text-ink-4 border border-line rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && <p className="px-3 py-8 text-center text-sm text-ink-4">—</p>}
          {items.map((c, i) => (
            <button
              key={c.id}
              onMouseEnter={() => setSel(i)}
              onClick={c.run}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-left transition-colors",
                i === sel ? "bg-surface-3 text-ink" : "text-ink-2 hover:bg-surface-2",
              )}
            >
              <span className={cn("grid place-items-center size-8 rounded-[var(--radius-sm)] border border-line shrink-0", c.kind === "ask" ? "bg-[var(--brand-soft)]" : "bg-surface-2")}>
                {c.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm">{c.label}</span>
                {c.hint && <span className="block mono text-[0.62rem] text-ink-4 uppercase tracking-wide">{c.hint}</span>}
              </span>
              {c.kind === "ask" ? <ArrowRight size={14} className="text-brand" /> : i === sel && <CornerDownLeft size={13} className="text-ink-4" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
