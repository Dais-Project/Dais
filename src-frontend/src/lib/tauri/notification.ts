import { isTauri } from ".";

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
