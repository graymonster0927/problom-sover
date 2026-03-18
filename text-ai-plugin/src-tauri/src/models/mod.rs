use serde::{Deserialize, Serialize};

pub mod agent;
pub mod settings;

pub use agent::{AgentChunk, AgentRequest, SelectionEvent, ToolCall, ToolResult};
pub use settings::{AppSettings, LlmConfig};

/// A history record of one AI interaction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryRecord {
    pub id: String,
    pub timestamp: String,
    pub input_text: String,
    pub ai_result: String,
    pub provider: String,
}
