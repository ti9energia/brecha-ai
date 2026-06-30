"use client";

// ─────────────────────────────────────────────────────────────────────────────
// BottomNav — barra de navegação inferior para viewport mobile (< md).
// Complementa o NavRail (desktop-only). Mostra até 4 módulos + copiloto.
// "safe-b" garante padding para o indicador home em iPhones com notch.
// ─────────────────────────────────────────────────────────────────────────────
import { Sparkles } from "lucide-react";
import { useWorkspace } from "./store";
import { useSession } from "./session";
import { useEntitlements } from "./entitlements";
import { useFlags } from "./flags";
import { MODULES } from "./registry";
import { useCopilot } from "@/components/Copilot";
import { useTranslations } from "@/i18n/provider";
import { cn } from "@/ui/cn";

const MAX_MODULES = 4; // + copiloto = 5 itens no máximo

export function BottomNav() {
  const ws = useWorkspace();
  const user = useSession();
  const copilot = useCopilot();
  const tNav = useTranslations("nav");
  const { isModuleEnabled } = useFlags();
  const { isEntitled } = useEntitlements();
  const canOwner = user.role === "platform_owner";

  const focusedPane = ws.state.panes.find((p) => p.id === ws.state.focusedPaneId);
  const activeModule = focusedPane
    ? ws.state.tabs[focusedPane.activeTabId]?.module
    : undefined;

  const mods = MODULES.filter(
    (m) =>
      !m.railHidden &&
      m.personas.includes(user.accountType) &&
      (m.id !== "owner" || canOwner) &&
      isModuleEnabled(m.id) &&
      isEntitled(m.id),
  ).slice(0, MAX_MODULES);

  return (
    <nav
      aria-label={tNav("mobileNav")}
      className="flex md:hidden shrink-0 items-stretch border-t border-line bg-[var(--canvas-deep)] safe-b"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {mods.map((m) => {
        const Icon = m.icon;
        const active = activeModule === m.id;
        return (
          <button
            key={m.id}
            onClick={() => ws.open(m.id)}
            aria-label={tNav(m.navKey)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 h-14 transition-colors",
              active ? "text-brand" : "text-ink-3 hover:text-ink active:bg-surface-2",
            )}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            <span className="text-[0.6rem] font-medium leading-tight tracking-tight">
              {tNav(m.navKey)}
            </span>
          </button>
        );
      })}

      {/* Copiloto — sempre visível */}
      <button
        onClick={copilot.toggle}
        aria-label={tNav("askCopilot")}
        aria-pressed={copilot.open}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 h-14 transition-colors",
          copilot.open ? "text-brand" : "text-ink-3 hover:text-ink active:bg-surface-2",
        )}
      >
        <Sparkles size={20} strokeWidth={copilot.open ? 2.2 : 1.8} />
        <span className="text-[0.6rem] font-medium leading-tight tracking-tight">
          {tNav("askCopilot")}
        </span>
      </button>
    </nav>
  );
}
