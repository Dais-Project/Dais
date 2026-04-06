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

type TabsState = {
  tabs: StoredTab[];
  activeTabId: TabId | null;
};

type TabsActions = {
  add: (tab: Tab) => void;
  setActive: (pattern: string | ((tab: StoredTab) => boolean)) => void;
  update: (updater: (draft: Draft<StoredTab[]>) => StoredTab[] | undefined) => void;
  updateMetadata: (id: string, metadata: Tab["metadata"]) => void;
  remove: (pattern: string | ((tab: StoredTab) => boolean)) => void;
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
            state.tabs = state.tabs.filter((t) => !pattern(t));
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
            // passed in tabId does not exist
            return;
          }
          state.tabs.splice(idx, 1);
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
    })),
    { name: "tabs" }
  ),
);
