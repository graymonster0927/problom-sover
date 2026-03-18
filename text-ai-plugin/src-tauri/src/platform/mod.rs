use crate::errors::AppError;
use crate::models::SelectionEvent;
use tauri::{AppHandle, Emitter, Manager};
use tauri::PhysicalPosition;
use tokio::sync::mpsc;

pub mod linux;
pub mod macos;
pub mod windows;

/// Unified trait for platform-specific text selection monitoring
pub trait PlatformSelector: Send + Sync {
    /// Start listening for text selection events; send them via `tx`
    fn start_listening(&self, tx: mpsc::Sender<SelectionEvent>) -> Result<(), AppError>;
    /// Stop the listener
    fn stop_listening(&self) -> Result<(), AppError>;
}

/// Factory: returns the correct platform implementation
pub fn create_platform_selector() -> Box<dyn PlatformSelector> {
    #[cfg(target_os = "macos")]
    return Box::new(macos::MacosSelector::new());

    #[cfg(target_os = "windows")]
    return Box::new(windows::WindowsSelector::new());

    #[cfg(target_os = "linux")]
    return Box::new(linux::LinuxSelector::new());

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    return Box::new(NoopSelector);
}

/// Start the global selection listener.
/// On receiving a SelectionEvent, the backend directly positions and shows the
/// float_ball window (no frontend round-trip needed), then emits the event so
/// the frontend can store the selected text for the AI step.
pub async fn start_selection_listener(app: AppHandle) {
    let (tx, mut rx) = mpsc::channel::<SelectionEvent>(32);

    let selector = create_platform_selector();
    if let Err(e) = selector.start_listening(tx) {
        tracing::error!("Failed to start platform listener: {}", e);
        return;
    }

    tracing::info!("[platform] Platform selection listener started — waiting for events");

    // Log all known window labels at startup so we can verify float_ball is registered
    {
        let labels: Vec<String> = app.webview_windows().keys().cloned().collect();
        tracing::info!("[platform] Known webview windows at startup: {:?}", labels);
    }

    while let Some(event) = rx.recv().await {
        tracing::info!(
            "[platform] SelectionEvent received: text={:?}... x={} y={}",
            &event.text[..event.text.len().min(40)],
            event.x,
            event.y
        );

        // Directly show the float_ball window — no frontend round-trip.
        // Do NOT call set_focus() so the user's active application keeps focus
        // and the selected text region stays highlighted.
        match app.get_webview_window("float_ball") {
            Some(win) => {
                let px = (event.x + 12.0) as i32;
                let py = (event.y - 60.0) as i32;
                tracing::info!("[platform] float_ball window found — moving to ({}, {}) and showing", px, py);
                match win.set_position(tauri::Position::Physical(PhysicalPosition::new(px, py))) {
                    Ok(_) => tracing::debug!("[platform] set_position OK"),
                    Err(e) => tracing::error!("[platform] set_position failed: {}", e),
                }
                match win.show() {
                    Ok(_) => tracing::info!("[platform] float_ball.show() OK"),
                    Err(e) => tracing::error!("[platform] float_ball.show() failed: {}", e),
                }
                // Intentionally no set_focus() — keep focus in the source application
            }
            None => {
                let labels: Vec<String> = app.webview_windows().keys().cloned().collect();
                tracing::error!(
                    "[platform] float_ball window NOT FOUND! Available windows: {:?}",
                    labels
                );
            }
        }

        // Emit event so the float_ball WebView stores the text in its Zustand store
        tracing::debug!("[platform] Emitting selection_event to all windows");
        if let Err(e) = app.emit("selection_event", &event) {
            tracing::warn!("[platform] Failed to emit selection_event: {}", e);
        }
    }

    tracing::warn!("[platform] start_selection_listener loop exited — channel closed");
}

/// Fallback no-op selector for unsupported platforms
#[allow(dead_code)]
struct NoopSelector;

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
impl PlatformSelector for NoopSelector {
    fn start_listening(&self, _tx: mpsc::Sender<SelectionEvent>) -> Result<(), AppError> {
        tracing::warn!("NoopSelector: platform not supported");
        Ok(())
    }
    fn stop_listening(&self) -> Result<(), AppError> {
        Ok(())
    }
}
