"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useWorkspace } from "./store";
import { useSession, initials } from "./session";
import { useEntitlements } from "./entitlements";
import { useFlags } from "./flags";
import { MODULES } from "./registry";
import { useCopilot } from "@/components/Copilot";
import { useTranslations, useLocale } from "@/i18n/provider";
import { Mark } from "@/ui/Logo";
import { cn } from "@/ui/cn";

export function NavRail() {
  const ws = useWorkspace();
  const user = useSession();
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const copilot = useCopilot();
  const { isModuleEnabled } = useFlags();
  const { isEntitled } = useEntitlements();
  // RBAC: só platform_owner vê o módulo do dono.
  const canOwner = user.role === "platform_owner";

  const focusedPane = ws.state.panes.find((p) => p.id === ws.state.focusedPaneId);
  const activeModule = focusedPane ? ws.state.tabs[focusedPane.activeTabId]?.module : undefined;

  const groups: ("product" | "intelligence" | "governance")[] = ["product", "intelligence", "governance"];

  return (
    <nav className="w-[3.75rem] shrink-0 flex flex-col items-center border-r border-line bg-[var(--canvas-deep)] py-3">
      <Link href={`/${locale}`} className="grid place-items-center size-10 rounded-[var(--radius-md)] hover:bg-surface-2 transition-colors mb-3" title={tNav("backToSite")} aria-label={tNav("backToSite")}>
        <Mark size={26} />
      </Link>

      <div className="flex-1 flex flex-col items-center gap-1 w-full px-2">
        {groups.map((g, gi) => (
          <div key={g} className="contents">
            {gi > 0 && <span className="my-1.5 h-px w-7 bg-[color:var(--border)]" />}
            {MODULES.filter((m) => m.group === g && !m.railHidden && m.personas.includes(user.accountType) && (m.id !== "owner" || canOwner) && isModuleEnabled(m.id) && isEntitled(m.id)).map((m) => {
              const Icon = m.icon;
              const active = activeModule === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => ws.open(m.id)}
                  title={tNav(m.navKey)}
                  aria-label={tNav(m.navKey)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative grid place-items-center size-10 rounded-[var(--radius-md)] transition-colors group",
                    active ? "bg-[var(--brand-soft)] text-brand" : "text-ink-3 hover:text-ink hover:bg-surface-2",
                  )}
                >
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-brand" style={{ left: "-0.5rem" }} />}
                  <Icon size={19} />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <button
        onClick={copilot.toggle}
        title={tNav("askCopilot")}
        aria-label={tNav("askCopilot")}
        aria-pressed={copilot.open}
        className={cn(
          "relative grid place-items-center size-10 rounded-[var(--radius-md)] mt-2 transition-all",
          copilot.open ? "bg-brand text-on-brand" : "border border-line-gold bg-[var(--brand-soft)] text-brand hover:brightness-110",
        )}
      >
        <Sparkles size={18} />
        {!copilot.open && <span className="absolute inset-0 rounded-[var(--radius-md)] border border-line-gold animate-[pulse-ring_3s_ease-out_infinite]" />}
      </button>

      <span className="mt-3 grid place-items-center size-9 rounded-full bg-surface-3 border border-line text-ink-2 font-display font-semibold text-sm" title={`${user.name} · ${user.role}`}>
        {initials(user.name)}
      </span>
    </nav>
  );
}
