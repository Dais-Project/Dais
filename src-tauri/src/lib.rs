mod args;
mod commands;
mod plugins;
mod protocols;
mod state;
mod utils;

pub use args::Args;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_window_state::{StateFlags, WindowExt};

fn start_sidecar(app: tauri::AppHandle, server_port: u16) -> Result<CommandChild, String> {
  let mut child = app
    .shell()
    .sidecar("server")
    .expect("Failed to get sidecar")
    .args(["--port", &server_port.to_string()])
    .spawn()
    .expect("Failed to spawn sidecar");

  tauri::async_runtime::spawn(async move {
    while let Some(event) = child.0.recv().await {
      match event {
        CommandEvent::Stdout(line) => {
          println!("Sidecar output: {:?}", String::from_utf8(line));
        }
        CommandEvent::Stderr(line) => {
          eprintln!("Sidecar error: {:?}", String::from_utf8(line));
        }
        CommandEvent::Error(err) => {
          eprintln!("Sidecar error: {}", err);
        }
        CommandEvent::Terminated(code) => {
          println!("Sidecar exited with code: {:?}", code);
        }
        _ => {}
      }
    }
  });
  return Ok(child.1);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(args: Args) {
  const DEV_PORT: u16 = 1460;
  let server_port = if args.dev {
    DEV_PORT
  } else {
    utils::get_available_tcp_port().expect("Failed to get available port")
  };

  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_window_state::Builder::default().build())
    .plugin(plugins::inject_vars::init(HashMap::from([
      ("dev", args.dev.to_string()),
      ("server_port", server_port.to_string()),
    ])))
    .register_uri_scheme_protocol(protocols::APP_PROTOCOL_NAME, protocols::handle_app_protocol)
    .setup(move |app| {
      if !args.dev {
        // only start sidecar in production mode
        let child = start_sidecar(app.handle().clone(), server_port)?;
        app.manage(state::AppState {
          child: Mutex::new(Some(child)),
        });
      } else {
        app.manage(state::AppState {
          child: Mutex::new(None::<CommandChild>),
        });
      }

      // init autostart plugin
      #[cfg(desktop)]
      let autostart_plugin_init_result = app.handle().plugin(tauri_plugin_autostart::init(
        tauri_plugin_autostart::MacosLauncher::LaunchAgent,
        None,
      ));
      if let Err(err) = autostart_plugin_init_result {
        eprintln!("Failed to initialize autostart plugin: {}", err);
      }

      // single instance plugin
      #[cfg(desktop)]
      let _ = app
        .handle()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}));

      let window_url = if args.dev {
        tauri::WebviewUrl::External("http://localhost:1420".parse().unwrap())
      } else {
        tauri::WebviewUrl::CustomProtocol("app://localhost/".parse().unwrap())
      };
      let window = tauri::WebviewWindowBuilder::new(app, "main", window_url)
        .title("Dais")
        .inner_size(800.0, 600.0)
        .visible(false)
        .devtools(true)
        .disable_drag_drop_handler()
        .build()?;
      window.restore_state(StateFlags::all())?;
      window.show()?;
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![commands::devtools::open_devtools])
    .build(tauri::generate_context!())
    .expect("error while running tauri application")
    .run(|app_handle, event| match event {
      tauri::RunEvent::Exit => {
        let state = app_handle.state::<state::AppState>();
        let Ok(mut guard) = state.child.lock() else {
          return;
        };
        let Some(child) = guard.take() else {
          return;
        };
        let _ = child.kill();
      }
      _ => {}
    });
}
