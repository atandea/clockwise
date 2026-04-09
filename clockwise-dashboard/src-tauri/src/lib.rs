use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;

struct AppState {
    server_process: Mutex<Option<CommandChild>>,
}

#[tauri::command]
fn get_server_status(state: tauri::State<AppState>) -> String {
    let server = state.server_process.lock().unwrap();
    if server.is_some() {
        "running".to_string()
    } else {
        "stopped".to_string()
    }
}

#[derive(Serialize)]
struct MonitorInfo {
    name: String,
    width: u32,
    height: u32,
    x: i32,
    y: i32,
    scale_factor: f64,
}

#[tauri::command]
fn get_monitors(app: tauri::AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    Ok(monitors
        .iter()
        .enumerate()
        .map(|(i, m)| MonitorInfo {
            name: m.name().cloned().unwrap_or_else(|| format!("Display {}", i + 1)),
            width: m.size().width,
            height: m.size().height,
            x: m.position().x,
            y: m.position().y,
            scale_factor: m.scale_factor(),
        })
        .collect())
}

#[tauri::command]
fn open_timer_window(app: tauri::AppHandle, monitor_name: Option<String>) -> Result<(), String> {
    // Close existing window if any
    if let Some(existing) = app.get_webview_window("timer-view") {
        let _ = existing.destroy();
        // Small delay to let the old window fully close
        std::thread::sleep(std::time::Duration::from_millis(100));
    }

    // Find the target monitor
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    
    for m in &monitors {
        log::info!(
            "Monitor: {:?}, pos: ({}, {}), size: {}x{}, scale: {}",
            m.name(),
            m.position().x,
            m.position().y,
            m.size().width,
            m.size().height,
            m.scale_factor()
        );
    }

    let selected = if let Some(ref name) = monitor_name {
        monitors
            .iter()
            .find(|m| m.name().map(|n| n == name).unwrap_or(false))
            .ok_or_else(|| format!("Monitor '{}' not found", name))?
    } else {
        monitors.first().ok_or_else(|| "No monitors found".to_string())?
    };

    let pos = selected.position();
    let size = selected.size();
    log::info!(
        "Selected monitor: {:?}, positioning at ({}, {}), size {}x{}",
        selected.name(),
        pos.x,
        pos.y,
        size.width,
        size.height
    );
    let (x, y) = (pos.x, pos.y);

    // Create window at a small size first — position will be set explicitly after
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        "timer-view",
        tauri::WebviewUrl::App("/view".into()),
    )
    .title("Clockwise Timer")
    .decorations(false)
    .build()
    .map_err(|e| e.to_string())?;

    // Use PhysicalPosition to move the window to the correct monitor
    use tauri::PhysicalPosition;
    window.set_position(PhysicalPosition::new(x, y)).map_err(|e| e.to_string())?;

    // Set fullscreen after a delay so the window lands on the correct monitor
    let win = window.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(500));
        
        #[cfg(target_os = "linux")]
        {
            use gtk::prelude::*;
            if let Ok(gtk_window) = win.gtk_window() {
                if let Some(screen) = gtk::prelude::GtkWindowExt::screen(&gtk_window) {
                    let display = screen.display();
                    let n_monitors = display.n_monitors();
                    let mut best_monitor_idx = 0;
                    let mut min_distance = i64::MAX;

                    for i in 0..n_monitors {
                        if let Some(m) = display.monitor(i) {
                            let geom = m.geometry();
                            let scale = m.scale_factor() as i32;
                            let g_x = geom.x() * scale;
                            let g_y = geom.y() * scale;
                            let dx = g_x as i64 - x as i64;
                            let dy = g_y as i64 - y as i64;
                            let dist = dx * dx + dy * dy;
                            log::info!("GDK Monitor {}: pos ({},{}), scale {}, distance {}", i, geom.x(), geom.y(), scale, dist);
                            if dist < min_distance {
                                min_distance = dist;
                                best_monitor_idx = i;
                            }
                        }
                    }
                    log::info!("Fullscreening on GDK monitor index {}", best_monitor_idx);
                    gtk_window.fullscreen_on_monitor(&screen, best_monitor_idx);
                }
            }
        }
        
        #[cfg(not(target_os = "linux"))]
        {
            let _ = win.set_fullscreen(true);
        }
    });

    Ok(())
}

#[tauri::command]
fn close_timer_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window("timer-view") {
        existing.destroy().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn get_local_ip() -> String {
    use std::net::UdpSocket;
    // Standard trick to get the default interface IP by "connecting" to an external DNS
    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(local_addr) = socket.local_addr() {
                return local_addr.ip().to_string();
            }
        }
    }
    "127.0.0.1".to_string()
}

#[tauri::command]
fn is_timer_window_open(app: tauri::AppHandle) -> bool {
    app.get_webview_window("timer-view").is_some()
}

fn cleanup_processes(state: &AppState) {
    if let Some(child) = state.server_process.lock().unwrap().take() {
        log::info!("Terminating clockwise-server");
        let _ = child.kill();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        // This environment variable fixes the "Could not create default EGL display: EGL_BAD_PARAMETER" error
        // on some Linux distributions (like Arch Linux) using Wayland/Nvidia.
        if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            server_process: Mutex::new(None),
        })
        .setup(|app| {
            let state = app.state::<AppState>();
            
            // Resolve app data dir
            let app_data_dir = app.path().app_data_dir().expect("failed to get app data dir");
            // Ensure directory exists
            if !app_data_dir.exists() {
                std::fs::create_dir_all(&app_data_dir).expect("failed to create app data dir");
            }
            
            // Construct the data file path
            let data_file_path = app_data_dir.join("data.json");
            let data_file_str = data_file_path.to_string_lossy().to_string();
            
            log::info!("Using data file: {}", data_file_str);
            
            // Start clockwise-server sidecar
            match app.shell().sidecar("clockwise-server") {
                Ok(command) => {
                    let (mut _rx, child) = command
                        .env("APP_DATA_FILE", &data_file_str)
                        .spawn()
                        .expect("Failed to spawn sidecar");
                    log::info!("clockwise-server started with PID: {}", child.pid());
                    *state.server_process.lock().unwrap() = Some(child);
                }
                Err(e) => {
                     log::error!("Failed to create sidecar command: {}", e);
                }
            }
            
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if window.label() == "main" {
                    // Clean up child processes and close timer window when main window closes
                    let state = window.state::<AppState>();
                    cleanup_processes(state.inner());
                    // Also close timer-view window
                    if let Some(timer_win) = window.app_handle().get_webview_window("timer-view") {
                        let _ = timer_win.destroy();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_server_status,
            get_monitors,
            open_timer_window,
            close_timer_window,
            get_local_ip,
            is_timer_window_open,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
