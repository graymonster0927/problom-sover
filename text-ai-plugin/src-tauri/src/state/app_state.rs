use crate::models::AppSettings;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;

pub struct AppState {
    pub settings: Arc<Mutex<AppSettings>>,
    pub cancel_token: Arc<Mutex<Option<CancellationToken>>>,
}
