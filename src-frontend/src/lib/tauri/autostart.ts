import { isTauri } from ".";

export async function getAutostartEnabled() {
  if (!isTauri) {
    return false;
  }

  const { isEnabled } = await import("@tauri-apps/plugin-autostart");
  return await isEnabled();
}

export async function setAutostartEnabled(enabled: boolean) {
  if (!isTauri) {
    return;
  }

  const { disable, enable } = await import("@tauri-apps/plugin-autostart");

  if (enabled) {
    await enable();
    return;
  }

  await disable();
}
