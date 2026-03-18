use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A single LLM provider configuration entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmConfig {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub api_key: String,
    pub model: String,
    pub base_url: Option<String>,
}

impl LlmConfig {
    pub fn new_default(provider: &str, name: &str, model: &str, api_key: &str, base_url: Option<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            provider: provider.to_string(),
            api_key: api_key.to_string(),
            model: model.to_string(),
            base_url,
        }
    }
}

/// Application settings stored persistently
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    /// Legacy single-provider fields (kept for backwards-compat deserialization)
    #[serde(default)]
    pub provider: String,
    #[serde(default)]
    pub api_key: String,
    #[serde(default)]
    pub model: String,
    #[serde(default)]
    pub base_url: Option<String>,

    /// Multi-LLM config list (new)
    #[serde(default)]
    pub llm_configs: Vec<LlmConfig>,
    /// ID of the currently active LLM config
    #[serde(default)]
    pub active_llm_id: Option<String>,

    pub hotkey: String,
    pub enabled: bool,
    pub max_iterations: u32,
    pub timeout_secs: u64,
}

impl AppSettings {
    /// Return the active LlmConfig, falling back to legacy fields if no configs exist
    pub fn active_llm(&self) -> LlmConfig {
        if let Some(ref id) = self.active_llm_id {
            if let Some(cfg) = self.llm_configs.iter().find(|c| &c.id == id) {
                return cfg.clone();
            }
        }
        if let Some(first) = self.llm_configs.first() {
            return first.clone();
        }
        // Legacy fallback
        LlmConfig {
            id: "legacy".to_string(),
            name: format!("{} / {}", self.provider, self.model),
            provider: self.provider.clone(),
            api_key: self.api_key.clone(),
            model: self.model.clone(),
            base_url: self.base_url.clone(),
        }
    }
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            provider: "openai".to_string(),
            api_key: String::new(),
            model: "gpt-4o".to_string(),
            base_url: None,
            llm_configs: Vec::new(),
            active_llm_id: None,
            hotkey: "".to_string(),
            enabled: true,
            max_iterations: 10,
            timeout_secs: 30,
        }
    }
}
