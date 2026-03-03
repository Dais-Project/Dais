export const isTauri = () => globalThis.__TAURI_INTERNALS__ !== undefined;

enum TauriCommand {
  OpenDevtools = "open_devtools",
}

export async function openDevtools() {
  if (!isTauri()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke(TauriCommand.OpenDevtools);
}
