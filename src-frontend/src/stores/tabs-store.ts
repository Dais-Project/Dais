import { create } from "zustand";
import { nanoid } from "nanoid";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { type Draft } from "immer";
import type { Tab } from "@/types/tab";

type TabId = string;

export type StoredTab = Tab & {
  id: TabId;
  createdAt: number;
};

export type TabIndicator = "in-progress" | "success" | "warning" | "destructive";

type TabsState = {
  tabs: StoredTab[];
  activeTabId: TabId | null;
  indicators: Record<TabId, TabIndicator>;
};

type TabsActions = {
  add: (tab: Tab) => void;
  setActive: (pattern: string | ((tab: StoredTab) => boolean)) => void;
  update: (updater: (draft: Draft<StoredTab[]>) => StoredTab[] | undefined) => void;
  updateMetadata: (id: string, metadata: Tab["metadata"]) => void;
  remove: (pattern: string | ((tab: StoredTab) => boolean)) => void;
  setIndicator: (tabId: string, indicator: TabIndicator | null) => void;
};

type TabsStore = TabsState & TabsActions;

function tabIdFactory() {
  return nanoid();
}

export const useTabsStore = create<TabsStore>()(
  persist(
    immer((set, _get) => ({
      tabs: [],
      activeTabId: null,
      indicators: {},
      add(tab) {
        set((state: TabsState) => {
          const newTab = {
            ...tab,
            id: tabIdFactory(),
            createdAt: Date.now(),
          };
          state.tabs.push(newTab);
          state.activeTabId = newTab.id;
        });
      },
      setActive(pattern) {
        if (typeof pattern === "function") {
          set((state) => {
            const tab = state.tabs.find(pattern);
            if (tab) {
              state.activeTabId = tab.id;
            }
          });
          return;
        }
        const id = pattern;
        set((state) => {
          const exists = state.tabs.some((t) => t.id === id);
          if (!exists) {
            return {};
          }
          return { activeTabId: id };
        });
      },
      update(updater) {
        set((state) => {
          const tabsDraft = updater(state.tabs);
          if (tabsDraft !== undefined) {
            state.tabs = tabsDraft;
          }
        });
      },
      updateMetadata(id, metadata) {
        set((state: TabsState) => {
          const tab = state.tabs.find((t) => t.id === id);
          if (!tab) {
            return;
          }
          tab.metadata = metadata;
        });
      },
      remove(pattern) {
        if (typeof pattern === "function") {
          set((state: TabsState) => {
            const removedTabs = state.tabs.filter(pattern);
            state.tabs = state.tabs.filter((t) => !pattern(t));
            removedTabs.forEach((tab) => {
              delete state.indicators[tab.id];
            });
            if (!state.tabs.find((t) => t.id === state.activeTabId)) {
              state.activeTabId = state.tabs.at(-1)?.id ?? null;
            }
          });
          return;
        }
        const id = pattern;
        set((state: TabsState) => {
          const idx = state.tabs.findIndex((t) => t.id === id);
          if (idx === -1) {
            return;
          }
          state.tabs.splice(idx, 1);
          delete state.indicators[id];
          if (state.activeTabId !== id) {
            return;
          }
          if (state.tabs.length === 0) {
            state.activeTabId = null;
            return;
          }
          const hasTabOnRight = idx < state.tabs.length;
          state.activeTabId = hasTabOnRight ? state.tabs[idx].id : state.tabs[idx - 1].id;
        });
      },
      setIndicator(tabId, indicator) {
        set((state: TabsState) => {
          const exists = state.tabs.some((tab) => tab.id === tabId);
          if (!exists) {
            return;
          }
          if (indicator === null) {
            delete state.indicators[tabId];
            return;
          }
          state.indicators[tabId] = indicator;
        });
      },
    })),
    {
      name: "tabs",
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  ),
);
