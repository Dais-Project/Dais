import { isTauri, saveFile as tauriSaveFile } from "./tauri";

function dynamicDownloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function saveFile(filename: string, content: string) {
  if (isTauri) {
    await tauriSaveFile(filename, content);
  } else {
    dynamicDownloadFile(filename, content);
  }
}
