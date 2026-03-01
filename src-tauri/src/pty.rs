use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};

pub struct PtyInstance {
    writer: Box<dyn Write + Send>,
    master: Box<dyn portable_pty::MasterPty + Send>,
    _child: Box<dyn portable_pty::Child + Send + Sync>,
}

pub struct PtyManager {
    instances: Arc<Mutex<HashMap<String, PtyInstance>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            instances: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn spawn(&self, id: String, app_handle: AppHandle) -> Result<(), String> {
        {
            let instances = self
                .instances
                .lock()
                .map_err(|_| "PTY manager lock poisoned".to_string())?;
            if instances.contains_key(&id) {
                return Ok(());
            }
        }

        let pty_system = native_pty_system();

        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let mut cmd = CommandBuilder::new(Self::get_shell());
        for arg in Self::get_shell_args() {
            cmd.arg(arg);
        }
        cmd.env("TERM", "xterm-256color");
        // Disable zsh session management (causes early exit)
        cmd.env("SHELL_SESSIONS_DISABLE", "1");
        // Explicit UTF-8 locale to reduce encoding mismatches.
        cmd.env("LANG", "en_US.UTF-8");
        cmd.env("LC_ALL", "en_US.UTF-8");
        // Set HOME directory
        if let Ok(home) = std::env::var("HOME") {
            cmd.cwd(&home);
            cmd.env("HOME", &home);
        }
        // Pass through PATH
        if let Ok(path) = std::env::var("PATH") {
            cmd.env("PATH", path);
        }
        // Set user
        if let Ok(user) = std::env::var("USER") {
            cmd.env("USER", user);
        }

        let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

        let master = pair.master;
        let mut reader = master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = master.take_writer().map_err(|e| e.to_string())?;

        // Store the instance
        {
            let mut instances = self
                .instances
                .lock()
                .map_err(|_| "PTY manager lock poisoned".to_string())?;
            instances.insert(
                id.clone(),
                PtyInstance {
                    writer,
                    master,
                    _child: child,
                },
            );
        }

        // Spawn reader thread
        let id_clone = id.clone();
        thread::spawn(move || {
            let mut buf = [0u8; 4096];
            let mut pending: Vec<u8> = Vec::new();

            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        pending.extend_from_slice(&buf[..n]);

                        loop {
                            match std::str::from_utf8(&pending) {
                                Ok(text) => {
                                    if !text.is_empty() {
                                        let _ = app_handle.emit(
                                            &format!("pty-output-{}", id_clone),
                                            text.to_string(),
                                        );
                                    }
                                    pending.clear();
                                    break;
                                }
                                Err(err) => {
                                    let valid_up_to = err.valid_up_to();

                                    if valid_up_to > 0 {
                                        if let Ok(valid_text) = std::str::from_utf8(&pending[..valid_up_to]) {
                                            let _ = app_handle.emit(
                                                &format!("pty-output-{}", id_clone),
                                                valid_text.to_string(),
                                            );
                                        }
                                        pending.drain(..valid_up_to);
                                        continue;
                                    }

                                    match err.error_len() {
                                        Some(invalid_len) => {
                                            let lossy = String::from_utf8_lossy(&pending[..invalid_len])
                                                .to_string();
                                            let _ = app_handle.emit(
                                                &format!("pty-output-{}", id_clone),
                                                lossy,
                                            );
                                            pending.drain(..invalid_len);
                                            continue;
                                        }
                                        None => {
                                            // Incomplete UTF-8 sequence at the tail.
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Err(_) => break,
                }
            }

            if !pending.is_empty() {
                let data = String::from_utf8_lossy(&pending).to_string();
                let _ = app_handle.emit(&format!("pty-output-{}", id_clone), data);
            }

            let _ = app_handle.emit(&format!("pty-exit-{}", id_clone), ());
        });

        Ok(())
    }

    pub fn write(&self, id: &str, data: &str) -> Result<(), String> {
        let mut instances = self
            .instances
            .lock()
            .map_err(|_| "PTY manager lock poisoned".to_string())?;
        if let Some(instance) = instances.get_mut(id) {
            instance
                .writer
                .write_all(data.as_bytes())
                .map_err(|e| e.to_string())?;
            instance.writer.flush().map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("PTY not found".to_string())
        }
    }

    pub fn resize(&self, id: &str, rows: u16, cols: u16) -> Result<(), String> {
        let mut instances = self
            .instances
            .lock()
            .map_err(|_| "PTY manager lock poisoned".to_string())?;
        if let Some(instance) = instances.get_mut(id) {
            instance
                .master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| e.to_string())
        } else {
            Err("PTY not found".to_string())
        }
    }

    pub fn kill(&self, id: &str) -> Result<(), String> {
        let mut instances = self
            .instances
            .lock()
            .map_err(|_| "PTY manager lock poisoned".to_string())?;
        instances.remove(id);
        Ok(())
    }

    fn get_shell() -> String {
        if cfg!(target_os = "windows") {
            "powershell.exe".to_string()
        } else {
            std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
        }
    }

    fn get_shell_args() -> Vec<String> {
        if cfg!(target_os = "windows") {
            vec![]
        } else {
            // Start as login shell so PATH from shell profile (e.g. ~/.zprofile) is loaded.
            vec!["-l".to_string()]
        }
    }
}

impl Default for PtyManager {
    fn default() -> Self {
        Self::new()
    }
}

// Tauri commands
#[tauri::command]
pub fn pty_spawn(id: String, app_handle: AppHandle, state: tauri::State<PtyManager>) -> Result<(), String> {
    state.spawn(id, app_handle)
}

#[tauri::command]
pub fn pty_write(id: String, data: String, state: tauri::State<PtyManager>) -> Result<(), String> {
    state.write(&id, &data)
}

#[tauri::command]
pub fn pty_resize(id: String, rows: u16, cols: u16, state: tauri::State<PtyManager>) -> Result<(), String> {
    state.resize(&id, rows, cols)
}

#[tauri::command]
pub fn pty_kill(id: String, state: tauri::State<PtyManager>) -> Result<(), String> {
    state.kill(&id)
}
