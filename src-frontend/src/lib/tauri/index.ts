import { isTauri as _isTauri } from "@tauri-apps/api/core";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useTabsStore } from "@/stores/tabs-store";

export const isTauri = _isTauri();

export { getAutostartEnabled, setAutostartEnabled } from "./autostart";
export { openDevtools } from "./devtool";
export { sendNotification } from "./notification";
export { saveFile } from "./save-file";

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

function closeActiveTab() {
  const { activeTabId, remove } = useTabsStore.getState();
  if (activeTabId === null) {
    return;
  }
  remove(activeTabId);
}

(() => {
  if (!isTauri) {
    return;
  }

  // ignore side mouse buttons
  window.addEventListener("mousedown", (e) => {
    if (e.button === 3 || e.button === 4) {
      e.preventDefault();
    }
  });

  // ignore alt + arrowleft or arrowright keys
  window.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      return;
    }

    if (e.isComposing || isEditableElement(e.target)) {
      return;
    }

    const key = e.key.toLowerCase();
    // Ctrl + B -> toggle sidebar
    if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && key === "b") {
      e.preventDefault();
      useSidebarStore.getState().toggle();
      return;
    }

    // Ctrl + W -> close active tab
    if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && key === "w") {
      e.preventDefault();
      closeActiveTab();
    }
  });

  // ignore devtools keydown under production for tauri
  if (globalThis.__INJECTED__?.dev === "true") {
    return;
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "F12") {
      e.preventDefault();
      e.stopPropagation();
    }
    if (e.ctrlKey && e.shiftKey && e.key === "I") {
      e.preventDefault();
      e.stopPropagation();
    }
  });
})();
