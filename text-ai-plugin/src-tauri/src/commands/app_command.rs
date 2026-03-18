use crate::errors::AppError;
use crate::models::{AgentChunk, HistoryRecord};
use crate::repositories::history_repo::HistoryRepo;
use crate::services::agent_service::AgentService;
use crate::state::AppState;
use crate::utils::http::build_client;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;
use uuid::Uuid;
use chrono::Utc;

/// Invoke the Agentic AI to solve the selected text problem.
/// Streams chunks back via Tauri events: "ai_chunk" and "ai_done".
#[tauri::command]
pub async fn solve_with_ai(
    text: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let settings = state.settings.lock().await.clone();

    if settings.api_key.is_empty() && settings.provider != "ollama" {
        return Err(AppError::ConfigError(
            "API key is not configured. Please go to Settings.".into(),
        ));
    }

    // Cancel any previous running agent
    let cancel = CancellationToken::new();
    {
        let mut guard = state.cancel_token.lock().await;
        if let Some(old) = guard.take() {
            old.cancel();
        }
        *guard = Some(cancel.clone());
    }

    let (chunk_tx, mut chunk_rx) = mpsc::channel::<String>(128);

    let app_clone = app.clone();
    let text_clone = text.clone();
    let cancel_clone = cancel.clone();

    // Spawn agent in background
    tauri::async_runtime::spawn(async move {
        let client = build_client(settings.timeout_secs);
        let agent = AgentService::new(client);

        let result = agent.solve(&text_clone, &settings, chunk_tx, cancel_clone).await;

        match result {
            Ok(full_text) => {
                // Persist to history
                let history_repo = HistoryRepo::new(&app_clone);
                let record = HistoryRecord {
                    id: Uuid::new_v4().to_string(),
                    timestamp: Utc::now().to_rfc3339(),
                    input_text: text_clone,
                    ai_result: full_text,
                    provider: settings.provider,
                };
                if let Err(e) = history_repo.append(&record) {
                    tracing::warn!("Failed to save history: {}", e);
                }
                let _ = app_clone.emit("ai_done", AgentChunk { content: String::new(), done: true });
            }
            Err(AppError::Cancelled) => {
                let _ = app_clone.emit("ai_done", AgentChunk { content: "[Cancelled]".into(), done: true });
            }
            Err(e) => {
                tracing::error!("Agent error: {}", e);
                let _ = app_clone.emit("ai_error", e.to_string());
                let _ = app_clone.emit("ai_done", AgentChunk { content: String::new(), done: true });
            }
        }
    });

    // Forward chunks to frontend via Tauri events
    tauri::async_runtime::spawn(async move {
        while let Some(chunk) = chunk_rx.recv().await {
            let _ = app.emit("ai_chunk", AgentChunk { content: chunk, done: false });
        }
    });

    Ok(())
}

/// Cancel a running AI generation
#[tauri::command]
pub async fn stop_ai(state: State<'_, AppState>) -> Result<(), AppError> {
    let mut guard = state.cancel_token.lock().await;
    if let Some(token) = guard.take() {
        token.cancel();
    }
    Ok(())
}
