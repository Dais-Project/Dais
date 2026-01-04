import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Tab, TabBase } from "@/types/tab";

type TabsState = {
  tabs: Tab[];
  activeTabId: string | null;
};

type TabsActions = {
  addTab: (tab: Tab) => void;
  setTabs: (tabs: Tab[]) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, tabData: Partial<TabBase>) => void;
  updateTabMetadata: (tabId: string, metadata: Tab["metadata"]) => void;
  removeTab: (tabId: string) => void;
};

type TabsStore = TabsState & TabsActions;

export const useTabsStore = create<TabsStore>()(
  persist(
    immer((set, get) => ({
      tabs: [],
      activeTabId: null,
      addTab(tab) {
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
      setTabs(tabs) {
        const currentActive = get().activeTabId;
        const activeStillExists = tabs.some((t) => t.id === currentActive);
        set({
          tabs,
          activeTabId: activeStillExists
            ? currentActive
            : (tabs[0]?.id ?? null),
        });
      },
      setActiveTab(tabId) {
        set((state) => {
          const exists = state.tabs.some((t) => t.id === tabId);
          if (!exists) {
            return {};
          }
          return { activeTabId: tabId };
        });
      },
      updateTab(tabId, tabData) {
        set((state: TabsState) => {
          const tab = state.tabs.find((t) => t.id === tabId);
          if (!tab) {
            return;
          }
          Object.assign(tab, tabData);
        });
      },
      updateTabMetadata(tabId, metadata) {
        set((state: TabsState) => {
          const tab = state.tabs.find((t) => t.id === tabId);
          if (!tab) {
            return;
          }
          tab.metadata = metadata;
        });
      },
      removeTab(tabId) {
        set((state: TabsState) => {
          const idx = state.tabs.findIndex((t) => t.id === tabId);
          if (idx === -1) {
            // passed in tabId does not exist
            return;
          }
          state.tabs.splice(idx, 1);
          if (state.activeTabId !== tabId) {
            return;
          }
          if (state.tabs.length === 0) {
            state.activeTabId = null;
            return;
          }
          const hasTabOnRight = idx < state.tabs.length;
          state.activeTabId = hasTabOnRight
            ? state.tabs[idx].id
            : state.tabs[idx - 1].id;
        });
      },
    })),
    { name: "tabs" }
  )
);
