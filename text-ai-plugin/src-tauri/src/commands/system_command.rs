use crate::errors::AppError;
use crate::models::{AppSettings, HistoryRecord};
use crate::repositories::history_repo::HistoryRepo;
use crate::services::settings_service::SettingsService;
use crate::state::AppState;
use tauri::{AppHandle, State};

/// Get current application settings
#[tauri::command]
pub async fn get_settings(
    _app: AppHandle,
    state: State<'_, AppState>,
) -> Result<AppSettings, AppError> {
    let settings = state.settings.lock().await.clone();
    Ok(settings)
}

/// Save application settings
#[tauri::command]
pub async fn save_settings(
    settings: AppSettings,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let svc = SettingsService::new(&app);
    svc.save(&settings)?;
    let mut guard = state.settings.lock().await;
    *guard = settings;
    Ok(())
}

/// List history records with pagination
#[tauri::command]
pub async fn list_history(
    page: usize,
    per_page: usize,
    app: AppHandle,
) -> Result<Vec<HistoryRecord>, AppError> {
    let repo = HistoryRepo::new(&app);
    repo.list(page, per_page)
}

/// Clear all history records
#[tauri::command]
pub async fn clear_history(app: AppHandle) -> Result<(), AppError> {
    let repo = HistoryRepo::new(&app);
    repo.clear()
}
