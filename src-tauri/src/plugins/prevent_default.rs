use tauri::{plugin::TauriPlugin, Runtime};
use tauri_plugin_prevent_default::{
  Builder, Flags, KeyboardShortcut,
  ModifierKey::{CtrlKey, ShiftKey},
};

pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new()
    .with_flags(
      Flags::all()
        .difference(Flags::FOCUS_MOVE) // allow shift + tab
        .difference(Flags::FIND), // allow ctrl + f
    )
    .shortcut(KeyboardShortcut::new("F12"))
    .shortcut(KeyboardShortcut::with_modifiers("I", &[CtrlKey, ShiftKey]))
    .build()
}
