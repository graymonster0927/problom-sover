use serde::{Deserialize, Serialize};

/// Event emitted when user selects text in any application
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionEvent {
    pub text: String,
    pub x: f64,
    pub y: f64,
}

/// Request to solve a problem with AI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRequest {
    pub text: String,
    pub provider: String,
}

/// A chunk of streaming AI response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentChunk {
    pub content: String,
    pub done: bool,
}

/// A tool call made by the AI agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    /// Raw JSON string of arguments (accumulated during streaming)
    pub arguments_str: String,
}

/// Result from a tool execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub tool_call_id: String,
    pub output: serde_json::Value,
    pub error: Option<String>,
}
