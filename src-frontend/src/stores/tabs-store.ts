import { create } from "zustand";
import { nanoid } from "nanoid";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { type Draft } from "immer";
import { useEffect } from "react";
import { useLatest } from "ahooks";
import type { Tab } from "@/types/tab";

type TabId = string;
type CloseHandler = () => void;
const TabsCloseHandlerRegistry = new (class {
  private map = new Map<TabId, Set<CloseHandler>>();

  register(id: TabId, handler: CloseHandler) {
    if (!this.map.has(id)) {
      this.map.set(id, new Set());
    }
    this.map.get(id)!.add(handler);
  }

  unregister(id: TabId, handler: CloseHandler) {
    const handlers = this.map.get(id);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.map.delete(id);
      }
    }
  }

  trigger(id: TabId) {
    const handlers = this.map.get(id);
    if (handlers) {
      handlers.forEach((handler) => handler());
      this.map.delete(id);
    }
  }
})();

export type StoredTab = Tab & { id: TabId };

type TabsState = {
  tabs: StoredTab[];
  activeTabId: TabId | null;
};

type TabsActions = {
  add: (tab: Tab) => void;
  setActive: (pattern: string | ((tab: StoredTab) => boolean)) => void;
  update: (updater: (draft: Draft<StoredTab[]>) => void | StoredTab[]) => void;
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
          const newTab = { ...tab, id: tabIdFactory(), isClosing: false };
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
        set((state) => updater(state.tabs));
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
            state.tabs.forEach((t) => pattern(t)
              && TabsCloseHandlerRegistry.trigger(t.id));
          });
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
          const targetTab = state.tabs.find((t) => t.id === id);
          targetTab && TabsCloseHandlerRegistry.trigger(targetTab.id);
        });
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

export function useTabUnmount(tabId: TabId, callback: () => void) {
  const callbackRef = useLatest(callback);
  useEffect(() => {
    const handler = () => callbackRef.current();
    TabsCloseHandlerRegistry.register(tabId, handler);
    return () => TabsCloseHandlerRegistry.unregister(tabId, handler);
  }, [tabId]);
}
