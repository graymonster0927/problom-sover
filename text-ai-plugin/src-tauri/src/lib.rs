use tauri::Manager;
use std::sync::Arc;
use tokio::sync::Mutex;

pub mod commands;
pub mod errors;
pub mod models;
pub mod platform;
pub mod repositories;
pub mod services;
pub mod state;
pub mod utils;

pub use errors::app_error::AppError;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    utils::logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Initialize managed state
            let settings = repositories::settings_repo::SettingsRepo::load_or_default(
                &app_handle,
            ).unwrap_or_default();

            app.manage(state::app_state::AppState {
                settings: Arc::new(Mutex::new(settings)),
                cancel_token: Arc::new(Mutex::new(None)),
            });

            // Force transparent background on transparent windows to prevent
            // the white flash on first show in macOS WebKit.
            // Note: We'll set transparency when windows are actually shown
            #[cfg(target_os = "macos")]
            {
                use tauri::window::Color;
                for label in &["float_ball", "result_panel"] {
                    if let Some(win) = app.get_webview_window(label) {
                        let _ = win.set_background_color(Some(Color(0, 0, 0, 0)));
                    }
                }
            }

            // Setup system tray
            setup_tray(&app_handle)?;

            // Start platform selection listener in background
            let handle_clone = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                platform::start_selection_listener(handle_clone).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::window_command::show_float_ball,
            commands::window_command::hide_float_ball,
            commands::window_command::show_result_panel,
            commands::window_command::hide_result_panel,
            commands::window_command::show_history_window,
            commands::window_command::show_settings_window,
            commands::app_command::solve_with_ai,
            commands::app_command::stop_ai,
            commands::system_command::get_settings,
            commands::system_command::save_settings,
            commands::system_command::list_history,
            commands::system_command::clear_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_tray(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
    use tauri::menu::{MenuBuilder, MenuItemBuilder};

    let toggle_item = MenuItemBuilder::with_id("toggle", "Enable/Disable").build(app)?;
    let settings_item = MenuItemBuilder::with_id("settings", "Settings").build(app)?;
    let history_item = MenuItemBuilder::with_id("history", "History").build(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[&toggle_item, &settings_item, &history_item, &quit_item])
        .build()?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle" => {
                tracing::info!("Toggle plugin");
            }
            "settings" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "history" => {
                if let Some(win) = app.get_webview_window("history") {
                    let _ = win.show();
                    let _ = win.set_focus();
                } else if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|_tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                tracing::debug!("Tray icon left click");
            }
        })
        .build(app)?;

    Ok(())
}
