mod pty;

use pty::PtyManager;
use std::fs::OpenOptions;
use std::io::Write as _;
use std::time::{SystemTime, UNIX_EPOCH};

fn append_lifecycle_log(message: &str) {
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let line = format!("[{}] {}\n", ts, message);
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open("/tmp/tabbed-terminal-lifecycle.log")
    {
        let _ = file.write_all(line.as_bytes());
    }
}

fn install_panic_hook() {
    std::panic::set_hook(Box::new(|info| {
        let payload = info
            .payload()
            .downcast_ref::<&str>()
            .map(|s| s.to_string())
            .or_else(|| info.payload().downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "unknown panic payload".to_string());
        let location = info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "unknown location".to_string());
        let backtrace = std::backtrace::Backtrace::force_capture();
        let body = format!(
            "[panic] {}\nlocation: {}\nbacktrace:\n{}\n\n",
            payload, location, backtrace
        );

        eprintln!("{body}");
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open("/tmp/tabbed-terminal-panic.log")
        {
            let _ = file.write_all(body.as_bytes());
        }
    }));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    install_panic_hook();
    append_lifecycle_log("run() started");

    let result = tauri::Builder::default()
        .manage(PtyManager::new())
        .invoke_handler(tauri::generate_handler![
            pty::pty_spawn,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_kill,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                append_lifecycle_log("setup() in debug mode");
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!());

    match result {
        Ok(()) => append_lifecycle_log("run() returned Ok (app exited)"),
        Err(e) => {
            append_lifecycle_log(&format!("run() returned Err: {}", e));
            panic!("error while running tauri application: {}", e);
        }
    }
}
