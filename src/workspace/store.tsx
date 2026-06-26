"use client";

import { createContext, useContext, useReducer, useCallback, useMemo, useEffect, type ReactNode } from "react";

export type ModuleId =
  | "opportunities"
  | "opportunity"
  | "radar"
  | "structure"
  | "simulator"
  | "execution"
  | "savings"
  | "settings"
  | "agent"
  | "owner";

export interface Tab {
  id: string;
  module: ModuleId;
  params?: Record<string, string>;
  title?: string;
}

export interface Pane {
  id: string;
  tabIds: string[];
  activeTabId: string;
}

export type Layout = "single" | "split-v" | "split-h";

export interface WorkspaceState {
  tabs: Record<string, Tab>;
  panes: Pane[];
  focusedPaneId: string;
  layout: Layout;
  seq: number;
}

export type Action =
  | { type: "OPEN"; module: ModuleId; params?: Record<string, string>; title?: string; paneId?: string }
  | { type: "CLOSE_TAB"; tabId: string; paneId: string }
  | { type: "FOCUS_TAB"; paneId: string; tabId: string }
  | { type: "FOCUS_PANE"; paneId: string }
  | { type: "SPLIT"; direction: "split-v" | "split-h" }
  | { type: "UNSPLIT" }
  | { type: "MOVE_TAB"; tabId: string; fromPaneId: string; toPaneId: string }
  | { type: "REORDER"; paneId: string; from: number; to: number }
  | { type: "HYDRATE"; state: WorkspaceState };

function sameTab(a: Tab, module: ModuleId, params?: Record<string, string>) {
  if (a.module !== module) return false;
  const ap = a.params ?? {};
  const bp = params ?? {};
  const keys = new Set([...Object.keys(ap), ...Object.keys(bp)]);
  for (const k of keys) if (ap[k] !== bp[k]) return false;
  return true;
}

export function initial(): WorkspaceState {
  const tab: Tab = { id: "tab-1", module: "opportunities" };
  return {
    tabs: { "tab-1": tab },
    panes: [{ id: "pane-1", tabIds: ["tab-1"], activeTabId: "tab-1" }],
    focusedPaneId: "pane-1",
    layout: "single",
    seq: 2,
  };
}

// ── Persistência (localStorage) ────────────────────────────────────────────────
// Um produto "estilo navegador" deve sobreviver ao reload. Persistimos abas/painéis
// e reidratamos APÓS o mount (via efeito) para não divergir do HTML do SSR.
const STORAGE_KEY = "brecha-workspace-v1";
const VALID_MODULES: ReadonlySet<string> = new Set<ModuleId>([
  "opportunities", "opportunity", "radar", "structure", "simulator",
  "execution", "savings", "settings", "agent", "owner",
]);

function persist(state: WorkspaceState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota cheia / modo privado — segue sem persistir */
  }
}

// Lê e SANEIA o estado salvo: descarta abas de módulos desconhecidos, painéis sem
// abas e referências quebradas. Devolve null se nada utilizável (cai no initial()).
function loadPersisted(): WorkspaceState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<WorkspaceState>;
    if (!s || typeof s !== "object" || !s.tabs || !Array.isArray(s.panes)) return null;

    const tabs: Record<string, Tab> = {};
    for (const [id, tab] of Object.entries(s.tabs)) {
      if (tab && typeof tab === "object" && VALID_MODULES.has((tab as Tab).module)) tabs[id] = tab as Tab;
    }
    const panes = s.panes
      .filter((p): p is Pane => !!p && Array.isArray(p.tabIds))
      .map((p) => ({ ...p, tabIds: p.tabIds.filter((id) => tabs[id]) }))
      .filter((p) => p.tabIds.length > 0)
      .map((p) => ({ ...p, activeTabId: tabs[p.activeTabId] ? p.activeTabId : p.tabIds[0] }));
    if (!panes.length) return null;

    const focusedPaneId = panes.some((p) => p.id === s.focusedPaneId) ? s.focusedPaneId! : panes[0].id;
    const layout: Layout = panes.length > 1 ? (s.layout === "split-h" ? "split-h" : "split-v") : "single";
    const seq = typeof s.seq === "number" && Number.isFinite(s.seq) && s.seq > 1 ? s.seq : Object.keys(tabs).length + 2;
    return { tabs, panes, focusedPaneId, layout, seq };
  } catch {
    return null;
  }
}

export function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;

    case "OPEN": {
      const paneId = action.paneId ?? state.focusedPaneId;
      const pane = state.panes.find((p) => p.id === paneId) ?? state.panes[0];
      // dedupe within the target pane
      const existingId = pane.tabIds.find((id) => sameTab(state.tabs[id], action.module, action.params));
      if (existingId) {
        return {
          ...state,
          focusedPaneId: pane.id,
          panes: state.panes.map((p) => (p.id === pane.id ? { ...p, activeTabId: existingId } : p)),
        };
      }
      const id = `tab-${state.seq}`;
      const tab: Tab = { id, module: action.module, params: action.params, title: action.title };
      return {
        ...state,
        seq: state.seq + 1,
        focusedPaneId: pane.id,
        tabs: { ...state.tabs, [id]: tab },
        panes: state.panes.map((p) =>
          p.id === pane.id ? { ...p, tabIds: [...p.tabIds, id], activeTabId: id } : p,
        ),
      };
    }

    case "FOCUS_TAB":
      return {
        ...state,
        focusedPaneId: action.paneId,
        panes: state.panes.map((p) => (p.id === action.paneId ? { ...p, activeTabId: action.tabId } : p)),
      };

    case "FOCUS_PANE":
      return { ...state, focusedPaneId: action.paneId };

    case "CLOSE_TAB": {
      const pane = state.panes.find((p) => p.id === action.paneId);
      if (!pane) return state;
      const idx = pane.tabIds.indexOf(action.tabId);
      const remaining = pane.tabIds.filter((id) => id !== action.tabId);
      const { [action.tabId]: _removed, ...restTabs } = state.tabs;

      // pane still has tabs → pick a neighbour as active
      if (remaining.length > 0) {
        const nextActive = pane.activeTabId === action.tabId ? remaining[Math.max(0, idx - 1)] : pane.activeTabId;
        return {
          ...state,
          tabs: restTabs,
          panes: state.panes.map((p) => (p.id === pane.id ? { ...p, tabIds: remaining, activeTabId: nextActive } : p)),
        };
      }

      // pane became empty
      if (state.panes.length > 1) {
        const panes = state.panes.filter((p) => p.id !== pane.id);
        return {
          ...state,
          tabs: restTabs,
          panes,
          layout: "single",
          focusedPaneId: panes[0].id,
        };
      }

      // last tab of the only pane → reopen default
      const id = `tab-${state.seq}`;
      return {
        ...state,
        seq: state.seq + 1,
        tabs: { [id]: { id, module: "opportunities" } },
        panes: [{ id: pane.id, tabIds: [id], activeTabId: id }],
      };
    }

    case "SPLIT": {
      if (state.panes.length > 1) return { ...state, layout: action.direction };
      const focused = state.panes.find((p) => p.id === state.focusedPaneId) ?? state.panes[0];
      const activeTab = state.tabs[focused.activeTabId];
      // new pane mirrors the focused tab so you can compare side by side
      const id = `tab-${state.seq}`;
      const clone: Tab = { id, module: activeTab.module, params: activeTab.params, title: activeTab.title };
      const newPane: Pane = { id: `pane-${state.seq + 1}`, tabIds: [id], activeTabId: id };
      return {
        ...state,
        seq: state.seq + 2,
        tabs: { ...state.tabs, [id]: clone },
        panes: [...state.panes, newPane],
        layout: action.direction,
        focusedPaneId: newPane.id,
      };
    }

    case "UNSPLIT": {
      if (state.panes.length < 2) return state;
      const [first, ...rest] = state.panes;
      const mergedTabIds = [first.tabIds, ...rest.map((p) => p.tabIds)].flat();
      return {
        ...state,
        panes: [{ id: first.id, tabIds: mergedTabIds, activeTabId: first.activeTabId }],
        layout: "single",
        focusedPaneId: first.id,
      };
    }

    case "MOVE_TAB": {
      if (action.fromPaneId === action.toPaneId) return state;
      const from = state.panes.find((p) => p.id === action.fromPaneId);
      const to = state.panes.find((p) => p.id === action.toPaneId);
      if (!from || !to || !from.tabIds.includes(action.tabId)) return state;
      const remaining = from.tabIds.filter((id) => id !== action.tabId);
      const toTabIds = to.tabIds.includes(action.tabId) ? to.tabIds : [...to.tabIds, action.tabId];

      // A aba movida vira a ativa do destino; o foco segue para lá.
      // Se a origem ficou sem abas, colapsa de volta para painel único (igual ao CLOSE_TAB).
      if (remaining.length === 0) {
        return {
          ...state,
          panes: [{ id: to.id, tabIds: toTabIds, activeTabId: action.tabId }],
          layout: "single",
          focusedPaneId: to.id,
        };
      }

      return {
        ...state,
        focusedPaneId: to.id,
        panes: state.panes.map((p) => {
          if (p.id === from.id) {
            const activeTabId = p.activeTabId === action.tabId ? remaining[remaining.length - 1] : p.activeTabId;
            return { ...p, tabIds: remaining, activeTabId };
          }
          if (p.id === to.id) return { ...p, tabIds: toTabIds, activeTabId: action.tabId };
          return p;
        }),
      };
    }

    case "REORDER": {
      return {
        ...state,
        panes: state.panes.map((p) => {
          if (p.id !== action.paneId) return p;
          const ids = [...p.tabIds];
          const [moved] = ids.splice(action.from, 1);
          ids.splice(action.to, 0, moved);
          return { ...p, tabIds: ids };
        }),
      };
    }

    default:
      return state;
  }
}

interface WorkspaceApi {
  state: WorkspaceState;
  open: (module: ModuleId, params?: Record<string, string>, title?: string, paneId?: string) => void;
  closeTab: (tabId: string, paneId: string) => void;
  focusTab: (paneId: string, tabId: string) => void;
  focusPane: (paneId: string) => void;
  split: (direction?: "split-v" | "split-h") => void;
  unsplit: () => void;
  moveTab: (tabId: string, fromPaneId: string, toPaneId: string) => void;
  reorder: (paneId: string, from: number, to: number) => void;
  setLayout: (direction: "split-v" | "split-h") => void;
}

const Ctx = createContext<WorkspaceApi | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);

  // Reidrata do localStorage uma vez, após o mount (SSR renderiza o initial()).
  useEffect(() => {
    const saved = loadPersisted();
    if (saved) dispatch({ type: "HYDRATE", state: saved });
  }, []);

  // Persiste a cada mudança — o workspace sobrevive ao reload.
  useEffect(() => {
    persist(state);
  }, [state]);

  const open = useCallback((module: ModuleId, params?: Record<string, string>, title?: string, paneId?: string) => {
    dispatch({ type: "OPEN", module, params, title, paneId });
  }, []);
  const closeTab = useCallback((tabId: string, paneId: string) => dispatch({ type: "CLOSE_TAB", tabId, paneId }), []);
  const focusTab = useCallback((paneId: string, tabId: string) => dispatch({ type: "FOCUS_TAB", paneId, tabId }), []);
  const focusPane = useCallback((paneId: string) => dispatch({ type: "FOCUS_PANE", paneId }), []);
  const split = useCallback((direction: "split-v" | "split-h" = "split-v") => dispatch({ type: "SPLIT", direction }), []);
  const unsplit = useCallback(() => dispatch({ type: "UNSPLIT" }), []);
  const moveTab = useCallback((tabId: string, fromPaneId: string, toPaneId: string) => dispatch({ type: "MOVE_TAB", tabId, fromPaneId, toPaneId }), []);
  const reorder = useCallback((paneId: string, from: number, to: number) => dispatch({ type: "REORDER", paneId, from, to }), []);
  const setLayout = useCallback((direction: "split-v" | "split-h") => dispatch({ type: "SPLIT", direction }), []);

  // Memoizado: o objeto-fachada só muda quando `state` muda (os dispatchers são
  // estáveis via useCallback). Sem isto, NavRail/TopBar/CommandPalette re-renderizam
  // a cada render do provider.
  const api = useMemo<WorkspaceApi>(
    () => ({ state, open, closeTab, focusTab, focusPane, split, unsplit, moveTab, reorder, setLayout }),
    [state, open, closeTab, focusTab, focusPane, split, unsplit, moveTab, reorder, setLayout],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWorkspace(): WorkspaceApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used within <WorkspaceProvider>");
  return ctx;
}

// Versão segura para componentes que podem viver fora do workspace (ex.: card
// reusado na landing): retorna null em vez de lançar.
export function useWorkspaceOptional(): WorkspaceApi | null {
  return useContext(Ctx);
}
