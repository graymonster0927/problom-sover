use crate::errors::AppError;
use crate::models::SelectionEvent;
use crate::platform::PlatformSelector;
use tokio::sync::mpsc;

/// macOS implementation using clipboard change detection
pub struct MacosSelector;

impl MacosSelector {
    pub fn new() -> Self {
        Self
    }
}

impl PlatformSelector for MacosSelector {
    fn start_listening(&self, tx: mpsc::Sender<SelectionEvent>) -> Result<(), AppError> {
        #[cfg(target_os = "macos")]
        {
            tracing::info!("[macos] MacosSelector::start_listening — spawning listener thread");
            std::thread::spawn(move || {
                macos_listen_loop(tx);
            });
        }
        #[cfg(not(target_os = "macos"))]
        {
            let _ = tx;
        }
        Ok(())
    }

    fn stop_listening(&self) -> Result<(), AppError> {
        Ok(())
    }
}

/// Read NSPasteboard changeCount via osascript.
/// Requires "use framework" so that ObjC classes are available.
#[cfg(target_os = "macos")]
fn get_pasteboard_change_count() -> Option<i64> {
    use std::process::Command;
    let script = r#"use framework "AppKit"
use scripting additions
return (current application's NSPasteboard's generalPasteboard()'s changeCount()) as integer"#;
    let out = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&out.stdout);
    let stderr = String::from_utf8_lossy(&out.stderr);

    if !stderr.trim().is_empty() {
        tracing::warn!(
            "[macos] get_pasteboard_change_count stderr: {}",
            stderr.trim()
        );
    }
    tracing::trace!("[macos] changeCount raw stdout: {:?}", stdout.trim());

    stdout.trim().parse::<i64>().ok()
}

/// Read clipboard text via pbpaste (no side effects, no key simulation)
#[cfg(target_os = "macos")]
fn get_clipboard_text() -> Option<String> {
    use std::process::Command;
    let out = Command::new("pbpaste").output().ok()?;
    let text = String::from_utf8_lossy(&out.stdout).trim().to_string();

    // 安全地截取字符串预览
    let preview = if text.len() <= 80 {
        text.as_str()
    } else {
        let mut end = 80.min(text.len());
        while end > 0 && !text.is_char_boundary(end) {
            end -= 1;
        }
        &text[..end]
    };
    tracing::trace!("[macos] pbpaste result: {:?}", preview);

    if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

#[cfg(target_os = "macos")]
fn macos_listen_loop(tx: mpsc::Sender<SelectionEvent>) {
    tracing::info!("[macos] macos_listen_loop started");

    // Warm-up: get initial changeCount so we don't fire on stale clipboard
    let mut last_change_count: i64 = {
        let c = get_pasteboard_change_count().unwrap_or(-1);
        tracing::info!("[macos] initial pasteboard changeCount = {}", c);
        c
    };

    let mut iteration: u64 = 0;
    loop {
        std::thread::sleep(std::time::Duration::from_millis(400));
        iteration += 1;

        let current_count = match get_pasteboard_change_count() {
            Some(c) => c,
            None => {
                if iteration % 10 == 0 {
                    tracing::warn!("[macos] iter={} — get_pasteboard_change_count returned None (osascript may be failing)", iteration);
                }
                continue;
            }
        };

        if iteration % 25 == 0 {
            tracing::debug!(
                "[macos] iter={} heartbeat — changeCount={} last={}",
                iteration,
                current_count,
                last_change_count
            );
        }

        // Only act when changeCount has actually increased (user copied something new)
        if current_count <= last_change_count {
            continue;
        }

        tracing::info!(
            "[macos] iter={} changeCount changed: {} -> {}",
            iteration,
            last_change_count,
            current_count
        );
        last_change_count = current_count;

        // Read clipboard text without simulating any keystrokes
        let text = match get_clipboard_text() {
            Some(t) => {
                // 安全地截取字符串预览（避免在 UTF-8 字符中间切片）
                let preview = if t.len() <= 60 {
                    t.as_str()
                } else {
                    // 找到 60 字节之前的最后一个字符边界
                    let mut end = 60.min(t.len());
                    while end > 0 && !t.is_char_boundary(end) {
                        end -= 1;
                    }
                    &t[..end]
                };
                tracing::debug!(
                    "[macos] clipboard text ({} chars): {:?}...",
                    t.len(),
                    preview
                );

                if t.len() >= 10_000 {
                    tracing::warn!(
                        "[macos] clipboard text too long ({} chars), skipping",
                        t.len()
                    );
                    continue;
                }
                t
            }
            None => {
                tracing::debug!(
                    "[macos] changeCount increased but clipboard text is empty — skipping"
                );
                continue;
            }
        };

        let (x, y) = get_mouse_position_macos();

        // 安全地截取字符串预览
        let preview = if text.len() <= 40 {
            text.as_str()
        } else {
            let mut end = 40.min(text.len());
            while end > 0 && !text.is_char_boundary(end) {
                end -= 1;
            }
            &text[..end]
        };

        tracing::info!(
            "[macos] Sending SelectionEvent: text={:?}... x={} y={}",
            preview,
            x,
            y
        );

        let event = SelectionEvent { text, x, y };

        if tx.blocking_send(event).is_err() {
            tracing::error!("[macos] SelectionEvent channel closed — stopping listener");
            break;
        }
        tracing::debug!("[macos] SelectionEvent sent to channel OK");
    }

    tracing::warn!("[macos] macos_listen_loop exited");
}

/// Get current mouse position in screen coordinates (top-left origin, Y down).
/// osascript NSEvent.mouseLocation returns Quartz coords (bottom-left origin, Y up),
/// so we flip Y using the main screen height.
#[cfg(target_os = "macos")]
fn get_mouse_position_macos() -> (f64, f64) {
    use std::process::Command;
    // Must use "use framework" for NSEvent and NSScreen.
    // frame() returns an NSRect coerced to {{originX, originY}, {width, height}};
    // access screenH via "item 2 of item 2" to avoid direct struct-field coercion errors.
    let script = r#"use framework "AppKit"
use scripting additions
set mousePos to (current application's NSEvent's mouseLocation())
set mouseX to mousePos's x
set mouseY to mousePos's y
set screenFrame to (current application's NSScreen's mainScreen()'s frame())
set frameList to screenFrame as list
set sizeList to item 2 of frameList as list
set screenH to item 2 of sizeList
return ((mouseX as integer) as string) & "," & (((screenH as integer) - (mouseY as integer)) as string)"#;

    let out = Command::new("osascript").arg("-e").arg(script).output();

    match out {
        Ok(result) => {
            let stdout = String::from_utf8_lossy(&result.stdout);
            let stderr = String::from_utf8_lossy(&result.stderr);
            if !stderr.trim().is_empty() {
                tracing::warn!("[macos] get_mouse_position stderr: {}", stderr.trim());
            }
            tracing::debug!("[macos] mouse pos raw: {:?}", stdout.trim());
            let s = stdout.trim();
            let parts: Vec<&str> = s.split(',').collect();
            if parts.len() == 2 {
                let x = parts[0].trim().parse::<f64>().unwrap_or(0.0);
                let y = parts[1].trim().parse::<f64>().unwrap_or(0.0);
                tracing::debug!("[macos] mouse position: x={} y={}", x, y);
                return (x, y);
            }
            tracing::warn!("[macos] mouse pos parse failed, raw={:?}", s);
            (0.0, 0.0)
        }
        Err(e) => {
            tracing::error!("[macos] get_mouse_position osascript failed: {}", e);
            (0.0, 0.0)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::mpsc;

    #[test]
    fn test_macos_selector_creation() {
        let selector = MacosSelector::new();
        let (tx, _rx) = mpsc::channel(1);
        let result = selector.start_listening(tx);
        assert!(result.is_ok());
    }

    #[test]
    fn test_macos_selector_stop() {
        let selector = MacosSelector::new();
        let result = selector.stop_listening();
        assert!(result.is_ok());
    }
}
