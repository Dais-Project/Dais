#[tauri::command]
pub fn open_devtools(window: tauri::WebviewWindow) {
  window.open_devtools();
}
