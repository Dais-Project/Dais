export const isTauri = () => globalThis.__TAURI_INTERNALS__ !== undefined;

enum TauriCommand {
  OpenDevtools = "open_devtools",
}

export async function openDevtools() {
  if (!isTauri()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke(TauriCommand.OpenDevtools);
}

(() => {
  if (!isTauri() || globalThis.__INJECTED__.dev === "true"){
    return;
  }
  // ignore devtools keydown
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
