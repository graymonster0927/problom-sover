use reqwest::Client;
use std::time::Duration;

/// Create a shared reqwest HTTP client with sensible defaults
pub fn build_client(timeout_secs: u64) -> Client {
    Client::builder()
        .timeout(Duration::from_secs(timeout_secs))
        .user_agent("text-ai-plugin/0.1.0")
        .build()
        .expect("Failed to build HTTP client")
}
