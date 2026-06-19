import { useMemo } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { isTauri } from "@/lib/tauri";
import { useSettingsStore } from "@/stores/settings-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useTabsStore } from "@/stores/tabs-store";

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

export function useGlobalShortcuts() {
  const shortcuts = useSettingsStore((state) => state.current.shortcuts);
  const toggleSidebar = useSidebarStore((state) => state.toggle);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const removeTab = useTabsStore((state) => state.remove);

  const toggleSidebarHotkey = useHotkey(shortcuts.toggle_sidebar);
  const closeTabHotkey = useHotkey(shortcuts.close_tab);

  const handleToggleSidebar = () => {
    toggleSidebar();
  };
  const handleCloseTab = () => {
    if (activeTabId === null) {
      return;
    }
    removeTab(activeTabId);
  };

  useHotkeys(toggleSidebarHotkey, handleToggleSidebar, {
    enabled: isTauri && shortcuts.toggle_sidebar.length > 0,
    preventDefault: true,
    ignoreEventWhen,
  });
  useHotkeys(closeTabHotkey, handleCloseTab, {
    enabled: isTauri && shortcuts.close_tab.length > 0,
    preventDefault: true,
    ignoreEventWhen,
  });
}
