use crate::errors::AppError;
use crate::models::SelectionEvent;
use crate::platform::PlatformSelector;
use tokio::sync::mpsc;

/// Windows implementation using SetWinEventHook
pub struct WindowsSelector;

impl WindowsSelector {
    pub fn new() -> Self {
        Self
    }
}

impl PlatformSelector for WindowsSelector {
    fn start_listening(&self, tx: mpsc::Sender<SelectionEvent>) -> Result<(), AppError> {
        #[cfg(target_os = "windows")]
        {
            std::thread::spawn(move || {
                windows_listen_loop(tx);
            });
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = tx;
        }
        Ok(())
    }

    fn stop_listening(&self) -> Result<(), AppError> {
        Ok(())
    }
}

#[cfg(target_os = "windows")]
fn windows_listen_loop(tx: mpsc::Sender<SelectionEvent>) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::Com::{CoInitializeEx, COINIT_APARTMENTTHREADED};
    use windows::Win32::UI::Accessibility::{SetWinEventHook, UnhookWinEvent, HWINEVENTHOOK};
    use windows::Win32::UI::WindowsAndMessaging::{GetMessageW, MSG};

    // Constants from Windows API
    const EVENT_OBJECT_TEXTSELECTIONCHANGED: u32 = 0x8014;
    const WINEVENT_OUTOFCONTEXT: u32 = 0x0000;
    const WINEVENT_SKIPOWNPROCESS: u32 = 0x0002;

    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED).ok();

        // Store tx in thread-local for the callback
        TX_SENDER.with(|cell| {
            *cell.borrow_mut() = Some(tx);
        });

        let hook = SetWinEventHook(
            EVENT_OBJECT_TEXTSELECTIONCHANGED,
            EVENT_OBJECT_TEXTSELECTIONCHANGED,
            None,
            Some(win_event_proc),
            0,
            0,
            WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS,
        );

        if hook.is_invalid() {
            tracing::error!("SetWinEventHook failed");
            return;
        }

        let mut msg = MSG::default();
        while GetMessageW(&mut msg, HWND::default(), 0, 0).as_bool() {
            // message loop keeps hook alive
        }

        UnhookWinEvent(hook);
    }
}

#[cfg(target_os = "windows")]
thread_local! {
    static TX_SENDER: std::cell::RefCell<Option<mpsc::Sender<SelectionEvent>>> =
        std::cell::RefCell::new(None);
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn win_event_proc(
    _hook: windows::Win32::UI::Accessibility::HWINEVENTHOOK,
    _event: u32,
    hwnd: windows::Win32::Foundation::HWND,
    _id_object: i32,
    _id_child: i32,
    _dw_event_thread: u32,
    _dwms_event_time: u32,
) {
    use windows::core::VARIANT;
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::Accessibility::{AccessibleObjectFromEvent, IAccessible};
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    const OBJID_CARET: i32 = -8;

    // Get cursor position for float ball placement
    let mut pt = POINT::default();
    GetCursorPos(&mut pt).ok();

    // Attempt to get selected text via IAccessible
    let mut pacc: Option<IAccessible> = None;
    let mut var_child = VARIANT::default();

    if AccessibleObjectFromEvent(hwnd, OBJID_CARET as u32, 0, &mut pacc, &mut var_child).is_ok() {
        if let Some(acc) = pacc {
            if let Ok(name) = acc.get_accName(&var_child) {
                let text = name.to_string();
                if !text.is_empty() {
                    TX_SENDER.with(|cell| {
                        if let Some(tx) = cell.borrow().as_ref() {
                            let event = SelectionEvent {
                                text,
                                x: pt.x as f64,
                                y: pt.y as f64,
                            };
                            let _ = tx.blocking_send(event);
                        }
                    });
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::mpsc;

    #[test]
    fn test_windows_selector_creation() {
        let selector = WindowsSelector::new();
        let (tx, _rx) = mpsc::channel(1);
        let result = selector.start_listening(tx);
        assert!(result.is_ok());
    }

    #[test]
    fn test_windows_selector_stop() {
        let selector = WindowsSelector::new();
        let result = selector.stop_listening();
        assert!(result.is_ok());
    }
}
