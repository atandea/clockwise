use std::sync::Mutex;

use serde::Serialize;
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
fn close_timer_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window("timer-view") {
        existing.destroy().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn get_local_ip() -> String {
    use std::net::UdpSocket;
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


/// Destroys the existing timer window (if any) and waits briefly for cleanup.
fn close_existing_timer_window(app: &tauri::AppHandle) {
    if let Some(existing) = app.get_webview_window("timer-view") {
        let _ = existing.destroy();
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
}

/// Logs every connected monitor's name, position, size, and scale factor.
fn log_available_monitors(monitors: &[tauri::Monitor]) {
    for m in monitors {
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
}

/// Returns the monitor matching `monitor_name`, or the first available monitor
/// when no name is provided.
fn select_monitor<'a>(
    monitors: &'a [tauri::Monitor],
    monitor_name: &Option<String>,
) -> Result<&'a tauri::Monitor, String> {
    if let Some(ref name) = monitor_name {
        monitors
            .iter()
            .find(|m| m.name().map(|n| n == name).unwrap_or(false))
            .ok_or_else(|| format!("Monitor '{}' not found", name))
    } else {
        monitors
            .first()
            .ok_or_else(|| "No monitors found".to_string())
    }
}

/// Creates the timer webview window (un-decorated, not yet positioned).
fn create_timer_webview(app: &tauri::AppHandle) -> Result<tauri::WebviewWindow, String> {
    tauri::WebviewWindowBuilder::new(
        app,
        "timer-view",
        tauri::WebviewUrl::App("/view".into()),
    )
    .title("Clockwise Timer")
    .decorations(false)
    .build()
    .map_err(|e| e.to_string())
}

/// Moves the window to the target monitor and enters fullscreen.
fn fullscreen_on_target_monitor(window: tauri::WebviewWindow) {
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(100));
        let _ = window.set_fullscreen(true);
    });
}

#[tauri::command]
fn open_timer_window(app: tauri::AppHandle, monitor_name: Option<String>) -> Result<(), String> {
    close_existing_timer_window(&app);

    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    log_available_monitors(&monitors);

    let selected = select_monitor(&monitors, &monitor_name)?;
    let pos = selected.position();
    let size = selected.size();
    log::info!(
        "Selected monitor: {:?}, positioning at ({}, {}), size {}x{}",
        selected.name(), pos.x, pos.y, size.width, size.height
    );

    let window = create_timer_webview(&app)?;

    use tauri::PhysicalPosition;
    window
        .set_position(PhysicalPosition::new(pos.x, pos.y))
        .map_err(|e| e.to_string())?;

    fullscreen_on_target_monitor(window);

    Ok(())
}

fn cleanup_processes(state: &AppState) {
    if let Some(child) = state.server_process.lock().unwrap().take() {
        log::info!("Terminating clockwise-server");
        let _ = child.kill();
    }
}

/// Shows and focuses the main dashboard window.
fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Builds the system-tray icon with **Show Dashboard** and **Exit** entries.
///
/// Clicking the tray icon shows the main window; the "Exit" menu item cleans
/// up the sidecar server before quitting.
fn build_tray_icon(app: &mut tauri::App) -> Result<tauri::tray::TrayIcon, Box<dyn std::error::Error>> {
    let quit_item = tauri::menu::MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;
    let show_item = tauri::menu::MenuItem::with_id(app, "show", "Show Dashboard", true, None::<&str>)?;

    let tray_menu = tauri::menu::MenuBuilder::new(app)
        .item(&show_item)
        .separator()
        .item(&quit_item)
        .build()?;

    let tray = tauri::tray::TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&tray_menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click {
                button: tauri::tray::MouseButton::Left,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                let state = app.state::<AppState>();
                cleanup_processes(state.inner());
                app.exit(0);
            }
            "show" => show_main_window(app),
            _ => {}
        })
        .build(app)?;

    Ok(tray)
}

/// Ensures the app-data directory exists and returns the full path to
/// `data.json` inside it.
fn resolve_data_file_path(app: &tauri::App) -> String {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");

    if !app_data_dir.exists() {
        std::fs::create_dir_all(&app_data_dir).expect("failed to create app data dir");
    }

    let data_file_path = app_data_dir.join("data.json");
    let data_file_str = data_file_path.to_string_lossy().to_string();
    log::info!("Using data file: {}", data_file_str);
    data_file_str
}

/// Spawns the `clockwise-server` sidecar and pipes its stdout/stderr into the
/// application log.
fn start_sidecar(app: &tauri::App, state: &AppState, data_file_str: &str) {
    match app.shell().sidecar("clockwise-server") {
        Ok(command) => {
            let (mut rx, child) = command
                .env("APP_DATA_FILE", data_file_str)
                .spawn()
                .expect("Failed to spawn sidecar");

            log::info!("clockwise-server started with PID: {}", child.pid());

            // Forward sidecar output to the Tauri log plugin
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::process::CommandEvent;
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            log::info!("server: {}", String::from_utf8_lossy(&line).trim());
                        }
                        CommandEvent::Stderr(line) => {
                            log::error!("server: {}", String::from_utf8_lossy(&line).trim());
                        }
                        _ => {}
                    }
                }
            });

            *state.server_process.lock().unwrap() = Some(child);
        }
        Err(e) => {
            log::error!("Failed to create sidecar command: {}", e);
        }
    }
}

// ---------------------------------------------------------------------------
// Application entry point
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            server_process: Mutex::new(None),
        })
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                None,
            ))?;

            let _tray = build_tray_icon(app)?;
            let data_file_str = resolve_data_file_path(app);
            let state = app.state::<AppState>();
            start_sidecar(app, state.inner(), &data_file_str);

            Ok(())
        })
        .on_window_event(|window, event| {
            // Hide the main window to the tray instead of closing it.
            // The timer-view window closes normally and can be reopened.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
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
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                let state = app.state::<AppState>();
                cleanup_processes(state.inner());
            }
        });
}
