"use client";

import { useState } from "react";
import { Plus, X, SplitSquareHorizontal, SplitSquareVertical, Columns2, Maximize2 } from "lucide-react";
import { useWorkspace, type Pane } from "./store";
import { MODULE_MAP, tabTitle } from "./registry";
import { useTranslations } from "@/i18n/provider";
import { cn } from "@/ui/cn";

export function PaneView({
  pane,
  focused,
  split,
  onNewTab,
}: {
  pane: Pane;
  focused: boolean;
  split: boolean;
  onNewTab: (paneId: string) => void;
}) {
  const ws = useWorkspace();
  const activeTab = ws.state.tabs[pane.activeTabId];
  const def = activeTab ? MODULE_MAP[activeTab.module] : null;
  const Comp = def?.component;

  return (
    <section
      onMouseDown={() => ws.focusPane(pane.id)}
      className={cn(
        "flex flex-col min-w-0 min-h-0 flex-1 relative",
        split && focused && "ring-1 ring-[color:var(--border-gold)] ring-inset z-10",
      )}
    >
      <TabStrip pane={pane} split={split} onNewTab={onNewTab} />
      <div className="flex-1 min-h-0 bg-canvas relative">
        {Comp && activeTab ? (
          <Comp key={activeTab.id} params={activeTab.params} paneId={pane.id} tabId={activeTab.id} />
        ) : null}
      </div>
    </section>
  );
}

function TabStrip({ pane, split, onNewTab }: { pane: Pane; split: boolean; onNewTab: (paneId: string) => void }) {
  const ws = useWorkspace();
  const tNav = useTranslations("nav");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  return (
    <div className="flex items-stretch h-11 border-b border-line bg-surface shrink-0 select-none">
      <div role="tablist" className="flex-1 flex items-stretch gap-1 px-1.5 overflow-x-auto no-scrollbar">
        {pane.tabIds.map((id, index) => {
          const tab = ws.state.tabs[id];
          if (!tab) return null;
          const def = MODULE_MAP[tab.module];
          const Icon = def.icon;
          const active = pane.activeTabId === id;
          return (
            <div
              key={id}
              role="tab"
              aria-selected={active}
              tabIndex={0}
              draggable
              onDragStart={(e) => { setDragIdx(index); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => { e.preventDefault(); if (overIdx !== index) setOverIdx(index); }}
              onDrop={(e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== index) ws.reorder(pane.id, dragIdx, index); setDragIdx(null); setOverIdx(null); }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              onMouseDown={(e) => { e.stopPropagation(); ws.focusTab(pane.id, id); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ws.focusTab(pane.id, id); }
                else if (e.key === "Delete") { e.preventDefault(); ws.closeTab(id, pane.id); }
              }}
              onAuxClick={(e) => { if (e.button === 1) ws.closeTab(id, pane.id); }}
              className={cn(
                "group relative flex items-center gap-2 max-w-[200px] min-w-0 my-1.5 pl-2.5 pr-1.5 rounded-[var(--radius-sm)] cursor-pointer transition-all",
                active ? "bg-surface-3 text-ink" : "text-ink-3 hover:bg-surface-2 hover:text-ink-2",
                dragIdx === index && "opacity-40",
                overIdx === index && dragIdx !== null && dragIdx !== index && "ring-1 ring-[color:var(--border-gold)]",
              )}
            >
              {active && <span className="absolute -bottom-1.5 left-2 right-2 h-px bg-brand" />}
              <Icon size={14} className={cn("shrink-0", active ? "text-brand" : "text-ink-4")} />
              <span className="truncate text-[0.82rem]">{tabTitle(tab, tNav)}</span>
              <button
                onMouseDown={(e) => { e.stopPropagation(); ws.closeTab(id, pane.id); }}
                className={cn(
                  "grid place-items-center size-5 rounded-[4px] shrink-0 transition-all hover:bg-surface-4 hover:text-ink",
                  active ? "opacity-70" : "opacity-0 group-hover:opacity-70",
                )}
                aria-label={tNav("closeTab")}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
        <button
          onMouseDown={(e) => { e.stopPropagation(); onNewTab(pane.id); }}
          className="my-1.5 ml-0.5 grid place-items-center size-7 rounded-[var(--radius-sm)] text-ink-4 hover:text-ink hover:bg-surface-2 transition-colors shrink-0"
          aria-label={tNav("newTab")}
          title={tNav("newTab")}
        >
          <Plus size={15} />
        </button>
      </div>

      {/* controles de painel */}
      <div className="flex items-center gap-0.5 px-1.5 border-l border-line">
        {!split ? (
          <>
            <PaneBtn onClick={() => ws.split("split-v")} title={tNav("splitRight")}><SplitSquareHorizontal size={15} /></PaneBtn>
            <PaneBtn onClick={() => ws.split("split-h")} title={tNav("splitDown")}><SplitSquareVertical size={15} /></PaneBtn>
          </>
        ) : (
          <>
            <PaneBtn onClick={() => ws.setLayout(ws.state.layout === "split-v" ? "split-h" : "split-v")} title={tNav("splitDown")}>
              {ws.state.layout === "split-v" ? <SplitSquareVertical size={15} /> : <Columns2 size={15} />}
            </PaneBtn>
            <PaneBtn onClick={() => ws.unsplit()} title={tNav("single")}><Maximize2 size={14} /></PaneBtn>
          </>
        )}
      </div>
    </div>
  );
}

function PaneBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onMouseDown={(e) => { e.stopPropagation(); onClick(); }}
      className="grid place-items-center size-7 rounded-[var(--radius-sm)] text-ink-4 hover:text-ink hover:bg-surface-2 transition-colors"
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}
