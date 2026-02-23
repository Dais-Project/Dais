import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import SseDispatcher from "@/lib/sse-dispatcher";
import type { Tab, TabBase } from "@/types/tab";

type TabsState = {
  tabs: Tab[];
  activeTabId: string | null;
};

type TabsActions = {
  add: (tab: Tab) => void;
  replace: (tabs: Tab[]) => void;
  setActive: (id: string) => void;
  update: (id: string, data: Partial<TabBase>) => void;
  updateMetadata: (id: string, metadata: Tab["metadata"]) => void;
  remove: (id: string) => void;
  removePattern: (pattern: (tab: Tab) => boolean) => void;
};

type TabsStore = TabsState & TabsActions;

export const useTabsStore = create<TabsStore>()(
  persist(
    immer((set, get) => {
      SseDispatcher.on("task_title_updated", ({ task_id, title }) => {
        set((state) => {
          const tab = state.tabs.find((t) => t.type === "task" && "id" in t.metadata && t.metadata.id === task_id);
          if (tab) {
            tab.title = title;
          }
        });
      });

      return {
        tabs: [],
        activeTabId: null,
        add(tab) {
          set((state: TabsState) => {
            const exists = state.tabs.some((t) => t.id === tab.id);
            if (exists) {
              state.activeTabId = tab.id;
              return;
            }
            state.tabs.push(tab);
            state.activeTabId = tab.id;
          });
        },
        replace(tabs) {
          const currentActive = get().activeTabId;
          const activeStillExists = tabs.some((t) => t.id === currentActive);
          set({
            tabs,
            activeTabId: activeStillExists ? currentActive : (tabs[0]?.id ?? null),
          });
        },
        setActive(id) {
          set((state) => {
            const exists = state.tabs.some((t) => t.id === id);
            if (!exists) {
              return {};
            }
            return { activeTabId: id };
          });
        },
        update(id, data) {
          set((state: TabsState) => {
            const tab = state.tabs.find((t) => t.id === id);
            if (!tab) {
              return;
            }
            Object.assign(tab, data);
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
        remove(id) {
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
        removePattern(pattern) {
          set((state: TabsState) => {
            state.tabs = state.tabs.filter((t) => !pattern(t));
          });
        },
      };
    }),
    { name: "tabs" }
  )
);
