use std::sync::Mutex;
use tauri_plugin_shell::process::CommandChild;

pub struct AppState {
  pub child: Mutex<Option<CommandChild>>,
}
