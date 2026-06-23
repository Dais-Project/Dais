import { isTauri } from ".";
import { TauriCommand } from "./commands";

export async function enableKeepAwake() {
  if (!isTauri) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke(TauriCommand.EnableKeepAwake);
}

export async function disableKeepAwake() {
  if (!isTauri) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke(TauriCommand.DisableKeepAwake);
}
