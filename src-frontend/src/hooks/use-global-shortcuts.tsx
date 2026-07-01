import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type HotkeyCallback, useHotkeys } from "react-hotkeys-hook";
import { isTauri, toggleFullscreen } from "@/lib/tauri";
import { openTaskCreateTab } from "@/features/SideBar/views/TasksView/shared";
import { useSettingsStore } from "@/stores/settings-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

function ignoreEventWhen(event: KeyboardEvent) {
  return event.isComposing || isEditableElement(event.target);
}

function useHotkey(keys: string[]): string {
  return useMemo(() => keys.join("+"), [keys]);
}

type GlobalShortcutsContextValue = {
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
};

const GlobalShortcutsContext =
  createContext<GlobalShortcutsContextValue | null>(null);

export function useGlobalShortcutsContext(): GlobalShortcutsContextValue {
  const context = useContext(GlobalShortcutsContext);
  if (!context) {
    throw new Error(
      "useGlobalShortcutsContext must be used within GlobalShortcutsProvider",
    );
  }
  return context;
}

type GlobalShortcutsProviderProps = {
  children: ReactNode;
};

export function GlobalShortcutsProvider({
  children,
}: GlobalShortcutsProviderProps) {
  // useTauriFullscreenShortcuts();

  const [isPaused, setIsPaused] = useState(false);

  const shortcuts = useSettingsStore((state) => state.current.shortcuts);
  const toggleSidebar = useSidebarStore((state) => state.toggle);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const removeTab = useTabsStore((state) => state.remove);

  const toggleSidebarHotkey = useHotkey(shortcuts.toggle_sidebar);
  const closeTabHotkey = useHotkey(shortcuts.close_tab);
  const newTaskHotkey = useHotkey(shortcuts.new_task);

  const handleToggleSidebar = () => toggleSidebar();

  const handleCloseTab = () => {
    if (activeTabId === null) {
      return;
    }
    removeTab(activeTabId);
  };

  const handleNewTask = () => {
    const currentWorkspace = useWorkspaceStore.getState().current;
    if (!currentWorkspace) {
      return;
    }
    openTaskCreateTab(currentWorkspace.id);
  };

  const handleSwitchTabByIndex = (_, event: Parameters<HotkeyCallback>[1]) => {
    const key = event.keys?.[0];
    if (key === undefined || !/^[1-9]$/.test(key)) {
      return;
    }
    const { tabs, setActive } = useTabsStore.getState();
    const tab = tabs[Number(key) - 1];
    if (tab) {
      setActive(tab.id);
    }
  };

  useHotkeys(toggleSidebarHotkey, handleToggleSidebar, {
    enabled: () => !isPaused && isTauri && shortcuts.toggle_sidebar.length > 0,
    preventDefault: true,
    ignoreEventWhen,
  });
  useHotkeys(closeTabHotkey, handleCloseTab, {
    enabled: () => !isPaused && isTauri && shortcuts.close_tab.length > 0,
    preventDefault: true,
    ignoreEventWhen,
  });
  useHotkeys(newTaskHotkey, handleNewTask, {
    enabled: () => !isPaused && isTauri && shortcuts.new_task.length > 0,
    preventDefault: true,
    ignoreEventWhen,
  });

  useHotkeys("f11", () => toggleFullscreen(), {
    enabled: () => !isPaused && isTauri,
    preventDefault: true,
    eventListenerOptions: { capture: true },
  });
  useHotkeys(
    "alt+1,alt+2,alt+3,alt+4,alt+5,alt+6,alt+7,alt+8,alt+9",
    handleSwitchTabByIndex,
    {
      enabled: () => !isPaused && isTauri,
      preventDefault: true,
      ignoreEventWhen,
    },
  );

  const value = useMemo<GlobalShortcutsContextValue>(
    () => ({
      isPaused,
      pause: () => setIsPaused(true),
      resume: () => setIsPaused(false),
    }),
    [isPaused],
  );

  return (
    <GlobalShortcutsContext value={value}>{children}</GlobalShortcutsContext>
  );
}
