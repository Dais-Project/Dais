import { createStore } from "zustand";
import { immer } from "zustand/middleware/immer";

type CollapsibleState = {
  collapsedMap: Record<string, boolean>;
};

type CollapsibleActions = {
  toggle: (id: string) => void;
  setCollapsed: (id: string, collapsed: boolean) => void;
  collapseAll: () => void;
  expandAll: () => void;
};

export type CollapsibleStore = CollapsibleState & CollapsibleActions;

export function createCollapsibleStore() {
  return createStore<CollapsibleStore>()(immer((set) => ({
    collapsedMap: {},

    toggle: (id) =>
      set((state) => {
        state.collapsedMap[id] = !state.collapsedMap[id];
      }),

    setCollapsed: (id, collapsed) =>
      set((state) => {
        state.collapsedMap[id] = collapsed;
      }),

    collapseAll: () =>
      set((state) => {
        Object.keys(state.collapsedMap).forEach((k) => {
          state.collapsedMap[k] = true;
        });
      }),

    expandAll: () =>
      set((state) => {
        state.collapsedMap = {};
      }),
  })));
}
