use serde::{Deserialize, Serialize};

/// Application settings stored persistently
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub provider: String,
    pub api_key: String,
    pub model: String,
    pub base_url: Option<String>,
    pub hotkey: String,
    pub enabled: bool,
    pub max_iterations: u32,
    pub timeout_secs: u64,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            provider: "openai".to_string(),
            api_key: String::new(),
            model: "gpt-4o".to_string(),
            base_url: None,
            hotkey: "".to_string(),
            enabled: true,
            max_iterations: 10,
            timeout_secs: 30,
        }
    }
}
