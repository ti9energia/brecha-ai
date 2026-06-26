"use client";

import { useRouter } from "next/navigation";
import { Search, ChevronDown, Command, LogOut } from "lucide-react";
import { useWorkspace } from "./store";
import { useCopilot } from "@/components/Copilot";
import { useTranslations, useLocale } from "@/i18n/provider";
import { ThemeToggle } from "@/ui/ThemeToggle";
import { LanguageSwitcher } from "@/ui/LanguageSwitcher";
import { cn } from "@/ui/cn";

export function TopBar({ onCommand }: { onCommand: () => void }) {
  const ws = useWorkspace();
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const copilot = useCopilot();
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <header className="flex items-center gap-3 h-12 px-3 border-b border-line bg-surface shrink-0">
      {/* workspace switcher → abre configurações da organização */}
      <button
        onClick={() => ws.open("settings")}
        aria-label={tNav("workspace")}
        className="flex items-center gap-2.5 h-9 pl-2 pr-2.5 rounded-[var(--radius-md)] hover:bg-surface-2 transition-colors max-w-[15rem]"
      >
        <span className="grid place-items-center size-6 rounded-[var(--radius-sm)] bg-brand text-on-brand font-display font-bold text-xs">A</span>
        <span className="min-w-0 text-left hidden sm:block">
          <span className="block text-[0.82rem] text-ink leading-tight truncate">{tNav("workspace")}</span>
          <span className="block mono text-[0.6rem] text-brand leading-tight">{tNav("plan")}</span>
        </span>
        <ChevronDown size={14} className="text-ink-4 shrink-0" />
      </button>

      {/* command palette trigger */}
      <button
        onClick={onCommand}
        aria-label={tNav("askCopilot")}
        className="flex-1 max-w-md flex items-center gap-2 h-9 px-3 rounded-[var(--radius-md)] border border-line bg-surface-2 text-ink-4 hover:border-line-strong transition-colors"
      >
        <Search size={14} />
        <span className="text-sm hidden sm:block">{tNav("askCopilot")}…</span>
        <span className="ml-auto hidden sm:flex items-center gap-0.5 mono text-[0.65rem]">
          <kbd className="grid place-items-center h-5 px-1.5 rounded border border-line bg-surface-3 text-ink-3"><Command size={10} /></kbd>
          <kbd className="grid place-items-center h-5 px-1.5 rounded border border-line bg-surface-3 text-ink-3">K</kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={copilot.toggle}
          aria-pressed={copilot.open}
          className={cn(
            "hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-md)] text-sm transition-all",
            "border border-line-gold bg-[var(--brand-soft)] text-brand hover:brightness-110",
          )}
        >
          <span aria-hidden>✦</span> Vega
        </button>
        <LanguageSwitcher />
        <ThemeToggle />
        <button onClick={logout} className="grid place-items-center size-9 rounded-[var(--radius-md)] border border-line bg-surface-2 text-ink-3 hover:text-ink hover:border-line-strong transition-colors" title={tNav("logout")} aria-label={tNav("logout")}>
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
