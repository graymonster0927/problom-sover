use crate::errors::AppError;
use crate::models::SelectionEvent;
use crate::platform::PlatformSelector;
use tokio::sync::mpsc;

/// Linux implementation using X11 XFixes PRIMARY selection monitoring
pub struct LinuxSelector;

impl LinuxSelector {
    pub fn new() -> Self {
        Self
    }
}

impl PlatformSelector for LinuxSelector {
    fn start_listening(&self, tx: mpsc::Sender<SelectionEvent>) -> Result<(), AppError> {
        #[cfg(target_os = "linux")]
        {
            std::thread::spawn(move || {
                linux_listen_loop(tx);
            });
        }
        #[cfg(not(target_os = "linux"))]
        {
            let _ = tx;
        }
        Ok(())
    }

    fn stop_listening(&self) -> Result<(), AppError> {
        Ok(())
    }
}

#[cfg(target_os = "linux")]
fn linux_listen_loop(tx: mpsc::Sender<SelectionEvent>) {
    use std::process::Command;

    let mut last_text = String::new();
    loop {
        std::thread::sleep(std::time::Duration::from_millis(350));

        // Read PRIMARY selection (text highlighted by mouse) via xclip or xsel
        let output = Command::new("xclip")
            .args(["-selection", "primary", "-o"])
            .output()
            .or_else(|_| {
                Command::new("xsel")
                    .args(["--primary", "--output"])
                    .output()
            });

        match output {
            Ok(out) if out.status.success() => {
                let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !text.is_empty() && text != last_text && text.len() < 10000 {
                    last_text = text.clone();
                    let (x, y) = get_mouse_position_linux();
                    let event = SelectionEvent { text, x, y };
                    if tx.blocking_send(event).is_err() {
                        break;
                    }
                }
            }
            _ => {
                // xclip/xsel not available or no selection — silent skip
            }
        }
    }
}

#[cfg(target_os = "linux")]
fn get_mouse_position_linux() -> (f64, f64) {
    use std::process::Command;

    // Use xdotool to get mouse position
    let output = Command::new("xdotool")
        .args(["getmouselocation", "--shell"])
        .output();

    if let Ok(out) = output {
        let s = String::from_utf8_lossy(&out.stdout);
        let mut x = 0.0f64;
        let mut y = 0.0f64;
        for line in s.lines() {
            if let Some(val) = line.strip_prefix("X=") {
                x = val.parse().unwrap_or(0.0);
            }
            if let Some(val) = line.strip_prefix("Y=") {
                y = val.parse().unwrap_or(0.0);
            }
        }
        return (x, y);
    }
    (0.0, 0.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::mpsc;

    #[test]
    fn test_linux_selector_creation() {
        let selector = LinuxSelector::new();
        let (tx, _rx) = mpsc::channel(1);
        let result = selector.start_listening(tx);
        assert!(result.is_ok());
    }

    #[test]
    fn test_linux_selector_stop() {
        let selector = LinuxSelector::new();
        let result = selector.stop_listening();
        assert!(result.is_ok());
    }

    #[test]
    fn test_selection_event_serialization() {
        let event = SelectionEvent {
            text: "hello world".to_string(),
            x: 100.0,
            y: 200.0,
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("hello world"));
        let decoded: SelectionEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.text, "hello world");
        assert_eq!(decoded.x, 100.0);
        assert_eq!(decoded.y, 200.0);
    }
}
