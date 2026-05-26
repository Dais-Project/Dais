use tauri::{
  http::{Request, Response},
  Manager, Runtime, UriSchemeContext,
};

pub const APP_PROTOCOL_NAME: &str = "app";

pub fn handle_app_protocol<R: Runtime>(
  ctx: UriSchemeContext<'_, R>,
  request: Request<Vec<u8>>,
) -> Response<Vec<u8>> {
  let resource_dir = ctx
    .app_handle()
    .path()
    .resource_dir()
    .expect("failed to get resource dir");
  let static_dir = resource_dir.join("dist/");

  let uri = request.uri();
  let path = uri.path().trim_start_matches('/');

  let rel_path = if path.is_empty() {
    "index.html".to_string()
  } else {
    path.to_string()
  };

  let file_path = static_dir.join(&rel_path);

  match std::fs::read(&file_path) {
    Ok(content) => {
      let mime = mime_guess::from_path(&file_path).first_or_octet_stream();
      Response::builder()
        .status(200)
        .header("Content-Type", mime.as_ref())
        .body(content)
        .unwrap()
    }
    Err(_) => {
      let index = static_dir.join("index.html");
      let content = std::fs::read(index).unwrap_or_default();
      Response::builder()
        .status(200)
        .header("Content-Type", "text/html")
        .body(content)
        .unwrap()
    }
  }
}
