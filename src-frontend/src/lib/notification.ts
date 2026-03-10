import { isTauri, sendNotification as sendTauriNotification } from "./tauri";

export type NotificationOptions = {
  body?: string;
  onClick?: () => void;
};

async function createNotification(
  title: string,
  options?: NotificationOptions,
) {
  const { body, onClick } = options ?? {};
  const notification = new Notification(title, { body });

  if (isTauri()) {
    // the notification API under tauri does not support onclick callback
    // so we can only make the window flash to notify the user.
    const { getCurrentWindow, UserAttentionType } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    await appWindow.requestUserAttention(UserAttentionType.Informational);
    if (!await appWindow.isFocused()) {
      let unlisten: (() => void) | undefined;
      unlisten = await appWindow.onFocusChanged(async ({ payload: focused }) => {
        if (!focused) {
          return;
        }
        unlisten?.();
        onClick?.();
      });
    }
  } else {
    notification.addEventListener("click", () => {
      window.focus();
      onClick?.();
    });
  }
}

export async function sendNotification(
  title: string,
  options?: NotificationOptions,
) {
  if (Notification.permission === "granted") {
    createNotification(title, options);
    return;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      createNotification(title, options);
      return;
    }
  }

  const { body } = options ?? {};
  if (isTauri()) {
    // use tauri notification as fallback
    sendTauriNotification(title, body);
    return;
  }
}
