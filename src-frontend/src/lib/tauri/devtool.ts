import { isTauri } from ".";
import { TauriCommand } from "./commands";

export async function openDevtools() {
  if (!isTauri) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke(TauriCommand.OpenDevtools);
}
