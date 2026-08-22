import { isTauri as _isTauri } from "@tauri-apps/api/core";

export const isTauri = _isTauri();
export { getAutostartEnabled, setAutostartEnabled } from "./autostart";
export { openDevtools } from "./devtool";
export { toggleFullscreen } from "./fullscreen";
export { disableKeepAwake, enableKeepAwake } from "./keep-awake";
export { sendNotification } from "./notification";
export { saveFile } from "./save-file";

(() => {
  if (!isTauri) return;

  // ignore side mouse buttons
  window.addEventListener("mousedown", (e) => {
    if (e.button === 3 || e.button === 4) {
      e.preventDefault();
    }
  });

  // ignore alt + arrowleft or arrowright keys
  window.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      return;
    }
  });
})();
