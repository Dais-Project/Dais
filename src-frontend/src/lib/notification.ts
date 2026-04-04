import { isTauri, sendNotification as sendTauriNotification } from "./tauri";

const LISTENER_TIMEOUT_MS = 60_000;

export type NotificationOptions = {
  body?: string;
  onClick?: () => void;
};

async function createTauriNotification(
  title: string,
  options?: NotificationOptions,
) {
  const { body, onClick } = options ?? {};

  // the notification API under tauri does not support onclick callback
  // so we can only make the window flash to notify the user.
  const { getCurrentWindow, UserAttentionType } = await import("@tauri-apps/api/window");
  const appWindow = getCurrentWindow();
  if (!await appWindow.isFocused()) {
    let unlisten: (() => void) | undefined;
    const timer = setTimeout(() => {
      unlisten?.();
    }, LISTENER_TIMEOUT_MS);
    unlisten = await appWindow.onFocusChanged(async ({ payload: focused }) => {
      if (!focused) {
        return;
      }
      await appWindow.requestUserAttention(null);
      clearTimeout(timer);
      unlisten?.();
      onClick?.();
    });
  }

  await Promise.all([
    appWindow.requestUserAttention(UserAttentionType.Informational),
    sendTauriNotification(title, body),
  ])
}

async function createWebNotification(
  title: string,
  options?: NotificationOptions,
) {
  const { body, onClick } = options ?? {};

  // web native notification
  let permission = Notification.permission;
  if (permission !== "granted") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    console.warn("Notification permission denied");
    return;
  }

  const notification = new Notification(title, { body });
  notification.addEventListener("click", () => {
    window.focus();
    onClick?.();
  });
}

export async function sendNotification(
  title: string,
  options?: NotificationOptions,
) {
  if (isTauri) {
    await createTauriNotification(title, options);
    return;
  }
  await createWebNotification(title, options);
}
