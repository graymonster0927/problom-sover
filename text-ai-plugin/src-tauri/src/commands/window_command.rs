use crate::errors::AppError;
use tauri::{AppHandle, Manager, PhysicalPosition};

/// Show the floating ball window at the given screen coordinates.
/// Does NOT steal focus from the user's active application so that the
/// text selection in the source app remains intact.
#[tauri::command]
pub async fn show_float_ball(x: f64, y: f64, app: AppHandle) -> Result<(), AppError> {
    if let Some(win) = app.get_webview_window("float_ball") {
        // Set transparent background before showing to avoid white flash
        #[cfg(target_os = "macos")]
        {
            use tauri::window::Color;
            let _ = win.set_background_color(Some(Color(0, 0, 0, 0)));
        }
        
        win.set_position(tauri::Position::Physical(PhysicalPosition::new(x as i32, y as i32)))
            .map_err(|e| AppError::PlatformError(e.to_string()))?;
        win.show()
            .map_err(|e| AppError::PlatformError(e.to_string()))?;
        // Intentionally no set_focus() — keep focus in the source application
        Ok(())
    } else {
        Err(AppError::PlatformError("float_ball window not found".into()))
    }
}

/// Hide the floating ball window
#[tauri::command]
pub async fn hide_float_ball(app: AppHandle) -> Result<(), AppError> {
    if let Some(win) = app.get_webview_window("float_ball") {
        win.hide()
            .map_err(|e| AppError::PlatformError(e.to_string()))?;
    }
    Ok(())
}

/// Show the result panel window
#[tauri::command]
pub async fn show_result_panel(x: f64, y: f64, app: AppHandle) -> Result<(), AppError> {
    if let Some(win) = app.get_webview_window("result_panel") {
        // Set transparent background before showing to avoid white flash
        #[cfg(target_os = "macos")]
        {
            use tauri::window::Color;
            let _ = win.set_background_color(Some(Color(0, 0, 0, 0)));
        }
        
        win.set_position(tauri::Position::Physical(PhysicalPosition::new(x as i32, y as i32)))
            .map_err(|e| AppError::PlatformError(e.to_string()))?;
        win.show()
            .map_err(|e| AppError::PlatformError(e.to_string()))?;
        win.set_focus()
            .map_err(|e| AppError::PlatformError(e.to_string()))?;
        Ok(())
    } else {
        Err(AppError::PlatformError("result_panel window not found".into()))
    }
}

/// Hide the result panel window
#[tauri::command]
pub async fn hide_result_panel(app: AppHandle) -> Result<(), AppError> {
    if let Some(win) = app.get_webview_window("result_panel") {
        win.hide()
            .map_err(|e| AppError::PlatformError(e.to_string()))?;
    }
    Ok(())
}

/// Show the history window
#[tauri::command]
pub async fn show_history_window(app: AppHandle) -> Result<(), AppError> {
    if let Some(win) = app.get_webview_window("history") {
        win.show()
            .map_err(|e| AppError::PlatformError(e.to_string()))?;
        win.set_focus()
            .map_err(|e| AppError::PlatformError(e.to_string()))?;
    }
    Ok(())
}

/// Show the main settings window
#[tauri::command]
pub async fn show_settings_window(app: AppHandle) -> Result<(), AppError> {
    if let Some(win) = app.get_webview_window("main") {
        win.show()
            .map_err(|e| AppError::PlatformError(e.to_string()))?;
        win.set_focus()
            .map_err(|e| AppError::PlatformError(e.to_string()))?;
    }
    Ok(())
}
