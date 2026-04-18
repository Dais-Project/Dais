import { isTauri, saveFile as tauriSaveFile } from "./tauri";

async function downloadFile(
  filename: string,
  content: string | ArrayBuffer | Blob,
  mimeType: string = "text/plain"
) {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType });

  // prefer to use modern showSaveFilePicker
  if ("showSaveFilePicker" in window) {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e: any) {
      if (e.name === "AbortError") {
        // The user cancelled downloading
        return;
      }
      console.error("Failed to download file:", e);
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export async function saveFile(filename: string, content: string) {
  if (isTauri) {
    await tauriSaveFile(filename, content);
  } else {
    await downloadFile(filename, content);
  }
}
