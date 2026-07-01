import { isTauri } from ".";

export async function toggleFullscreen(force?: boolean) {
  if (!isTauri) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const appWindow = getCurrentWindow();
  const isFullscreen = await appWindow.isFullscreen();
  await appWindow.setFullscreen(force ?? !isFullscreen);
}
