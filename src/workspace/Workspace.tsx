"use client";

import { Fragment, useEffect, useState } from "react";
import { WorkspaceProvider, useWorkspace } from "./store";
import { useIsNarrow } from "./useIsNarrow";
import { CopilotProvider, useCopilot } from "@/components/Copilot";
import { NavRail } from "./NavRail";
import { TopBar } from "./TopBar";
import { StatusBar } from "./StatusBar";
import { PaneView } from "./Pane";
import { CommandPalette } from "./CommandPalette";
import { cn } from "@/ui/cn";

export function Workspace() {
  return (
    <WorkspaceProvider>
      <CopilotProvider>
        <Shell />
      </CopilotProvider>
    </WorkspaceProvider>
  );
}

function Shell() {
  const ws = useWorkspace();
  const copilot = useCopilot();
  const [palette, setPalette] = useState<{ open: boolean; pane?: string }>({ open: false });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "k") { e.preventDefault(); setPalette((p) => ({ open: !p.open })); }
      else if (k === "j") { e.preventDefault(); copilot.toggle(); }
      else if (k === "\\") { e.preventDefault(); ws.state.panes.length > 1 ? ws.unsplit() : ws.split("split-v"); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copilot, ws]);

  const narrow = useIsNarrow();
  const allPanes = ws.state.panes;
  // No mobile, mostra só o painel focado (split é experiência de desktop).
  const panes = narrow ? allPanes.filter((p) => p.id === ws.state.focusedPaneId) : allPanes;
  const stacked = ws.state.layout === "split-h" && !narrow;

  return (
    <div className="h-dvh flex bg-canvas text-ink overflow-hidden">
      <NavRail />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onCommand={() => setPalette({ open: true })} />
        <div className={cn("flex-1 min-h-0 flex", stacked ? "flex-col" : "flex-row")}>
          {panes.map((p, i) => (
            <Fragment key={p.id}>
              {i > 0 && <span className={cn("bg-[color:var(--border-strong)] shrink-0", stacked ? "h-px w-full" : "w-px h-full")} />}
              <PaneView
                pane={p}
                focused={p.id === ws.state.focusedPaneId}
                split={allPanes.length > 1}
                onNewTab={(pane) => setPalette({ open: true, pane })}
              />
            </Fragment>
          ))}
        </div>
        <StatusBar />
      </div>
      <CommandPalette open={palette.open} onClose={() => setPalette({ open: false })} targetPaneId={palette.pane} />
    </div>
  );
}
