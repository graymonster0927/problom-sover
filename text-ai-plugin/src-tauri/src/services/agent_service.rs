use crate::errors::AppError;
use crate::models::{AppSettings, LlmConfig, ToolCall};
use crate::utils::sse::parse_sse_line;
use async_trait::async_trait;
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::{json, Value};
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

// ─── Tool trait ──────────────────────────────────────────────────────────────

#[async_trait]
pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn parameters_schema(&self) -> Value;
    async fn call(&self, input: Value) -> Result<Value, AppError>;
}

// ─── Built-in tools ──────────────────────────────────────────────────────────

pub struct WebSearchTool {
    client: Client,
}

impl WebSearchTool {
    pub fn new(client: Client) -> Self {
        Self { client }
    }
}

#[async_trait]
impl Tool for WebSearchTool {
    fn name(&self) -> &str { "web_search" }
    fn description(&self) -> &str { "Search the web for information. Input: {\"query\": \"...\"}" }
    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"}
            },
            "required": ["query"]
        })
    }
    async fn call(&self, input: Value) -> Result<Value, AppError> {
        let query = input["query"].as_str().unwrap_or("").to_string();
        // Use DuckDuckGo Instant Answer API (no key required)
        let url = format!(
            "https://api.duckduckgo.com/?q={}&format=json&no_html=1&skip_disambig=1",
            urlencoding::encode(&query)
        );
        let resp = self.client.get(&url).send().await
            .map_err(AppError::HttpError)?;
        let body: Value = resp.json().await.map_err(AppError::HttpError)?;
        let answer = body["AbstractText"].as_str().unwrap_or("").to_string();
        let related: Vec<String> = body["RelatedTopics"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .take(3)
            .filter_map(|t| t["Text"].as_str().map(String::from))
            .collect();
        Ok(json!({ "answer": answer, "related": related }))
    }
}

pub struct SummarizeTool;

#[async_trait]
impl Tool for SummarizeTool {
    fn name(&self) -> &str { "summarize" }
    fn description(&self) -> &str { "Summarize a long text. Input: {\"text\": \"...\"}" }
    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Text to summarize"}
            },
            "required": ["text"]
        })
    }
    async fn call(&self, input: Value) -> Result<Value, AppError> {
        let text = input["text"].as_str().unwrap_or("").to_string();
        // Simple extractive summary: first 3 sentences
        let sentences: Vec<&str> = text.split(". ").take(3).collect();
        Ok(json!({ "summary": sentences.join(". ") }))
    }
}

// ─── Agent Service ───────────────────────────────────────────────────────────

pub struct AgentService {
    tools: Vec<Box<dyn Tool>>,
}

impl AgentService {
    pub fn new(client: Client) -> Self {
        Self {
            tools: vec![
                Box::new(WebSearchTool::new(client.clone())),
                Box::new(SummarizeTool),
            ],
        }
    }

    /// ReAct loop: Think → Act (tool call) → Observe, until done or max_iterations
    pub async fn solve(
        &self,
        text: &str,
        settings: &AppSettings,
        chunk_tx: mpsc::Sender<String>,
        cancel: CancellationToken,
    ) -> Result<String, AppError> {
        let llm = settings.active_llm();
        match llm.provider.as_str() {
            "anthropic" => self.solve_anthropic(text, settings, &llm, chunk_tx, cancel).await,
            "ollama" => self.solve_ollama(text, settings, &llm, chunk_tx, cancel).await,
            _ => self.solve_openai(text, settings, &llm, chunk_tx, cancel).await,
        }
    }

    // ── OpenAI / OpenAI-compatible ──
    async fn solve_openai(
        &self,
        text: &str,
        settings: &AppSettings,
        llm: &LlmConfig,
        chunk_tx: mpsc::Sender<String>,
        cancel: CancellationToken,
    ) -> Result<String, AppError> {
        let base_url = llm.base_url.as_deref()
            .unwrap_or("https://api.openai.com/v1");
        let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

        let tools_json: Vec<Value> = self.tools.iter().map(|t| json!({
            "type": "function",
            "function": {
                "name": t.name(),
                "description": t.description(),
                "parameters": t.parameters_schema(),
            }
        })).collect();

        let system_prompt = "You are an expert AI assistant. Analyze the selected text and help solve any problems or questions it contains. Use tools when needed. Be concise and helpful.Must answer in Chinese.";

        let mut messages = vec![
            json!({"role": "system", "content": system_prompt}),
            json!({"role": "user", "content": format!("Please help me with this text:\n\n{}", text)}),
        ];

        let client = crate::utils::http::build_client(settings.timeout_secs);
        let mut full_response = String::new();

        for _iteration in 0..settings.max_iterations {
            if cancel.is_cancelled() {
                return Err(AppError::Cancelled);
            }

            let body = json!({
                "model": llm.model,
                "messages": messages,
                "tools": tools_json,
                "stream": true,
                "max_tokens": 2048,
            });

            let resp = client
                .post(&url)
                .header("Authorization", format!("Bearer {}", llm.api_key))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(AppError::HttpError)?;

            if !resp.status().is_success() {
                let status = resp.status();
                let err_body = resp.text().await.unwrap_or_default();
                return Err(AppError::AiError(format!("HTTP {}: {}", status, err_body)));
            }

            // Stream response
            let mut stream = resp.bytes_stream();
            let mut chunk_buffer = String::new();
            let mut tool_calls: Vec<ToolCall> = vec![];
            let mut finish_reason = String::new();

            while let Some(item) = tokio::select! {
                item = stream.next() => item,
                _ = cancel.cancelled() => return Err(AppError::Cancelled),
            } {
                let bytes = item.map_err(AppError::HttpError)?;
                let text_chunk = String::from_utf8_lossy(&bytes);

                for line in text_chunk.lines() {
                    if let Some(data) = parse_sse_line(line) {
                        if let Ok(parsed) = serde_json::from_str::<Value>(&data) {
                            let choice = &parsed["choices"][0];
                            let delta = &choice["delta"];

                            // Accumulate text content
                            if let Some(content) = delta["content"].as_str() {
                                chunk_buffer.push_str(content);
                                full_response.push_str(content);
                                let _ = chunk_tx.send(content.to_string()).await;
                            }

                            // Accumulate tool calls
                            if let Some(tc_array) = delta["tool_calls"].as_array() {
                                for tc in tc_array {
                                    let idx = tc["index"].as_u64().unwrap_or(0) as usize;
                                    while tool_calls.len() <= idx {
                                        tool_calls.push(ToolCall {
                                            id: String::new(),
                                            name: String::new(),
                                            arguments_str: String::new(),
                                        });
                                    }
                                    if let Some(id) = tc["id"].as_str() {
                                        tool_calls[idx].id = id.to_string();
                                    }
                                    if let Some(name) = tc["function"]["name"].as_str() {
                                        tool_calls[idx].name = name.to_string();
                                    }
                                    if let Some(args) = tc["function"]["arguments"].as_str() {
                                        tool_calls[idx].arguments_str.push_str(args);
                                    }
                                }
                            }

                            if let Some(fr) = choice["finish_reason"].as_str() {
                                finish_reason = fr.to_string();
                            }
                        }
                    }
                }
            }

            // If no tool calls, we're done
            if tool_calls.is_empty() || finish_reason == "stop" {
                break;
            }

            // Execute tool calls
            let assistant_msg = json!({
                "role": "assistant",
                "content": if chunk_buffer.is_empty() { Value::Null } else { json!(chunk_buffer) },
                "tool_calls": tool_calls.iter().map(|tc| json!({
                    "id": tc.id,
                    "type": "function",
                    "function": { "name": tc.name, "arguments": &tc.arguments_str }
                })).collect::<Vec<_>>()
            });
            messages.push(assistant_msg);

            for tc in &tool_calls {
                let tool_input: Value = serde_json::from_str(&tc.arguments_str)
                    .unwrap_or(json!({}));

                let tool_result = if let Some(tool) = self.tools.iter().find(|t| t.name() == tc.name) {
                    let _ = chunk_tx.send(format!("\n\n*[Using tool: {}...]*\n\n", tc.name)).await;
                    match tool.call(tool_input).await {
                        Ok(result) => result.to_string(),
                        Err(e) => format!("Tool error: {}", e),
                    }
                } else {
                    format!("Unknown tool: {}", tc.name)
                };

                messages.push(json!({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": tool_result,
                }));
            }
        }

        Ok(full_response)
    }

    // ── Anthropic ──
    async fn solve_anthropic(
        &self,
        text: &str,
        settings: &AppSettings,
        llm: &LlmConfig,
        chunk_tx: mpsc::Sender<String>,
        cancel: CancellationToken,
    ) -> Result<String, AppError> {
        let url = "https://api.anthropic.com/v1/messages";
        let client = crate::utils::http::build_client(settings.timeout_secs);

        let body = json!({
            "model": llm.model,
            "max_tokens": 2048,
            "stream": true,
            "messages": [
                {"role": "user", "content": format!("Please help me with this text:\n\n{}", text)}
            ]
        });

        let resp = client
            .post(url)
            .header("x-api-key", &llm.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(AppError::HttpError)?;

        if !resp.status().is_success() {
            let status = resp.status();
            let err_body = resp.text().await.unwrap_or_default();
            return Err(AppError::AiError(format!("HTTP {}: {}", status, err_body)));
        }

        let mut stream = resp.bytes_stream();
        let mut full_response = String::new();

        while let Some(item) = tokio::select! {
            item = stream.next() => item,
            _ = cancel.cancelled() => return Err(AppError::Cancelled),
        } {
            let bytes = item.map_err(AppError::HttpError)?;
            let text_chunk = String::from_utf8_lossy(&bytes);

            for line in text_chunk.lines() {
                if let Some(data) = parse_sse_line(line) {
                    if let Ok(parsed) = serde_json::from_str::<Value>(&data) {
                        if parsed["type"] == "content_block_delta" {
                            if let Some(content) = parsed["delta"]["text"].as_str() {
                                full_response.push_str(content);
                                let _ = chunk_tx.send(content.to_string()).await;
                            }
                        }
                    }
                }
            }
        }

        Ok(full_response)
    }

    // ── Ollama (local) ──
    async fn solve_ollama(
        &self,
        text: &str,
        settings: &AppSettings,
        llm: &LlmConfig,
        chunk_tx: mpsc::Sender<String>,
        cancel: CancellationToken,
    ) -> Result<String, AppError> {
        let base_url = llm.base_url.as_deref()
            .unwrap_or("http://localhost:11434");
        let url = format!("{}/api/generate", base_url.trim_end_matches('/'));
        let client = crate::utils::http::build_client(settings.timeout_secs);

        let body = json!({
            "model": llm.model,
            "prompt": format!("Please help me with this text:\n\n{}", text),
            "stream": true
        });

        let resp = client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(AppError::HttpError)?;

        if !resp.status().is_success() {
            let status = resp.status();
            let err_body = resp.text().await.unwrap_or_default();
            return Err(AppError::AiError(format!("HTTP {}: {}", status, err_body)));
        }

        let mut stream = resp.bytes_stream();
        let mut full_response = String::new();

        while let Some(item) = tokio::select! {
            item = stream.next() => item,
            _ = cancel.cancelled() => return Err(AppError::Cancelled),
        } {
            let bytes = item.map_err(AppError::HttpError)?;
            let text_chunk = String::from_utf8_lossy(&bytes);

            for line in text_chunk.lines() {
                let line = line.trim();
                if line.is_empty() { continue; }
                if let Ok(parsed) = serde_json::from_str::<Value>(line) {
                    if let Some(content) = parsed["response"].as_str() {
                        full_response.push_str(content);
                        let _ = chunk_tx.send(content.to_string()).await;
                    }
                }
            }
        }

        Ok(full_response)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_service_creation() {
        let client = crate::utils::http::build_client(30);
        let svc = AgentService::new(client);
        assert_eq!(svc.tools.len(), 2);
    }

    #[test]
    fn test_tool_names() {
        let client = crate::utils::http::build_client(30);
        let svc = AgentService::new(client);
        let names: Vec<&str> = svc.tools.iter().map(|t| t.name()).collect();
        assert!(names.contains(&"web_search"));
        assert!(names.contains(&"summarize"));
    }

    #[tokio::test]
    async fn test_summarize_tool() {
        let tool = SummarizeTool;
        let result = tool.call(json!({
            "text": "First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence."
        })).await.unwrap();
        let summary = result["summary"].as_str().unwrap();
        assert!(!summary.is_empty());
    }
}
