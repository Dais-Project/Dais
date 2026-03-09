import { isTauri, sendNotification as sendTauriNotification } from "./tauri";

export async function sendNotification(title: string, body: string) {
  if (isTauri()) {
    sendTauriNotification(title, body);
    return;
  }

  if (Notification.permission === "granted") {
    new Notification(title, { body });
    return;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification(title, { body });
    }
  }
}
