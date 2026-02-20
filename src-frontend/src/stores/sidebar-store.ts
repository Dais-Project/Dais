import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SideBarView = "tasks" | "workspaces" | "agents" | "toolsets" | "plugins" | "settings";

const DEFAULT_VIEW: SideBarView = "tasks";

type SidebarState = {
  isOpen: boolean;
  activeView: SideBarView | null;
};

type SidebarActions = {
  open: (view?: SideBarView) => void;
  close: () => void;
  toggle: (view?: SideBarView) => void;
};

type SidebarStore = SidebarState & SidebarActions;

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set, get) => ({
      isOpen: false,
      activeView: null,
      toggle: (view: SideBarView | null = null) => {
        const { isOpen, activeView } = get();
        if (activeView !== null && view !== null && view !== activeView) {
          set({ isOpen: true, activeView: view });
          return;
        }
        set({
          isOpen: !isOpen,
          activeView: view ?? activeView ?? DEFAULT_VIEW,
        });
      },
      open: (view: SideBarView | null = null) => {
        const { activeView } = get();
        set({ isOpen: true, activeView: view ?? activeView ?? DEFAULT_VIEW });
      },
      close: () => {
        set({ isOpen: false });
      },
    }),
    { name: "sidebar" }
  )
);
