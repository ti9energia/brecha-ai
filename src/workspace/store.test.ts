import { describe, it, expect } from "vitest";
import { reducer, initial, type Action, type WorkspaceState } from "./store";

function dispatch(state: WorkspaceState, ...actions: Action[]): WorkspaceState {
  return actions.reduce((s, a) => reducer(s, a), state);
}

function focusedPane(state: WorkspaceState) {
  return state.panes.find((p) => p.id === state.focusedPaneId)!;
}

describe("initial", () => {
  it("starts with one pane, one opportunities tab, single layout", () => {
    const s = initial();
    expect(s.panes).toHaveLength(1);
    expect(s.panes[0].tabIds).toHaveLength(1);
    const tab = s.tabs[s.panes[0].tabIds[0]];
    expect(tab.module).toBe("opportunities");
    expect(s.layout).toBe("single");
  });
});

describe("OPEN", () => {
  it("opens a radar tab and makes it active", () => {
    const s = dispatch(initial(), { type: "OPEN", module: "radar" });
    const pane = focusedPane(s);
    expect(pane.tabIds).toHaveLength(2);
    expect(s.tabs[pane.activeTabId].module).toBe("radar");
  });

  it("dedupes when opening the same module again", () => {
    const s = dispatch(
      initial(),
      { type: "OPEN", module: "radar" },
      { type: "OPEN", module: "radar" },
    );
    const pane = focusedPane(s);
    // Still 2 tabs (opportunities + radar), no duplicate radar tab.
    expect(pane.tabIds).toHaveLength(2);
    expect(s.tabs[pane.activeTabId].module).toBe("radar");
  });

  it("keeps distinct tabs for the same module with different params", () => {
    const s = dispatch(
      initial(),
      { type: "OPEN", module: "opportunity", params: { id: "x" } },
      { type: "OPEN", module: "opportunity", params: { id: "y" } },
    );
    const pane = focusedPane(s);
    // opportunities + opportunity(x) + opportunity(y) = 3 tabs
    expect(pane.tabIds).toHaveLength(3);
    const oppTabs = pane.tabIds
      .map((id) => s.tabs[id])
      .filter((t) => t.module === "opportunity");
    expect(oppTabs).toHaveLength(2);
    expect(oppTabs.map((t) => t.params?.id).sort()).toEqual(["x", "y"]);
  });
});

describe("SPLIT / UNSPLIT", () => {
  it("split-v creates a second pane and sets the layout", () => {
    const s = dispatch(initial(), { type: "SPLIT", direction: "split-v" });
    expect(s.panes).toHaveLength(2);
    expect(s.layout).toBe("split-v");
  });

  it("unsplit merges panes back into one and returns to single layout", () => {
    const split = dispatch(initial(), { type: "SPLIT", direction: "split-v" });
    const totalTabs = split.panes.reduce((n, p) => n + p.tabIds.length, 0);
    const merged = dispatch(split, { type: "UNSPLIT" });
    expect(merged.panes).toHaveLength(1);
    expect(merged.layout).toBe("single");
    expect(merged.panes[0].tabIds).toHaveLength(totalTabs);
  });
});

describe("CLOSE_TAB", () => {
  it("reopens a default opportunities tab when closing the only tab of the single pane", () => {
    const start = initial();
    const onlyTabId = start.panes[0].tabIds[0];
    const s = dispatch(start, {
      type: "CLOSE_TAB",
      tabId: onlyTabId,
      paneId: start.panes[0].id,
    });
    expect(s.panes).toHaveLength(1);
    expect(s.panes[0].tabIds).toHaveLength(1);
    const tab = s.tabs[s.panes[0].tabIds[0]];
    expect(tab.module).toBe("opportunities");
  });
});
