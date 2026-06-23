use std::sync::Mutex;

pub struct KeepAwakeState {
  guard: Mutex<Option<keepawake::KeepAwake>>,
}

impl KeepAwakeState {
  pub fn new() -> Self {
    Self {
      guard: Mutex::new(None),
    }
  }
}

#[tauri::command]
pub fn enable_keep_awake(state: tauri::State<KeepAwakeState>) -> Result<(), String> {
  let mut guard = state
    .guard
    .lock()
    .map_err(|_| "Failed to lock keep awake state".to_string())?;

  if guard.is_some() {
    return Ok(());
  }

  let keep_awake = keepawake::Builder::default()
    .display(true)
    .idle(true)
    .sleep(true)
    .reason("Dais is running a task")
    .app_name("Dais")
    .app_reverse_domain("org.dais.desktop")
    .create()
    .map_err(|err| err.to_string())?;
  *guard = Some(keep_awake);
  Ok(())
}

#[tauri::command]
pub fn disable_keep_awake(state: tauri::State<KeepAwakeState>) -> Result<(), String> {
  let mut guard = state
    .guard
    .lock()
    .map_err(|_| "Failed to lock keep awake state".to_string())?;
  guard.take();
  Ok(())
}
