import { isTauri as _isTauri } from "@tauri-apps/api/core";

enum TauriCommand {
  OpenDevtools = "open_devtools",
}

export const isTauri = _isTauri();

export async function openDevtools() {
  if (!isTauri) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke(TauriCommand.OpenDevtools);
}

export async function sendNotification(title: string, body?: string) {
  if (!isTauri) {
    return;
  }

  const { isPermissionGranted, requestPermission, sendNotification } = await import("@tauri-apps/plugin-notification");
  let permissionGranted = await isPermissionGranted();

  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }

  if (permissionGranted) {
    sendNotification({ title, body, sound: "Default" });
  }
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
    }
  })

  // ignore devtools keydown under production
  if (globalThis.__INJECTED__.dev === "true") {
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
