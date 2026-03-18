/// Integration tests for agent_service with mock HTTP server
/// Run with: cargo test --test agent_integration_test
#[cfg(test)]
mod tests {
    use mockito::Server;
    use serde_json::json;
    use text_ai_plugin_lib::services::agent_service::AgentService;
    use text_ai_plugin_lib::models::AppSettings;
    use text_ai_plugin_lib::utils::http::build_client;
    use tokio::sync::mpsc;
    use tokio_util::sync::CancellationToken;

    fn make_settings(base_url: &str) -> AppSettings {
        AppSettings {
            provider: "openai".to_string(),
            api_key: "test-key".to_string(),
            model: "gpt-4o".to_string(),
            base_url: Some(base_url.to_string()),
            hotkey: "".to_string(),
            enabled: true,
            max_iterations: 3,
            timeout_secs: 10,
        }
    }

    #[tokio::test]
    async fn test_openai_stream_basic() {
        let mut server = Server::new_async().await;

        // Mock SSE streaming response
        let sse_body = "data: {\"choices\":[{\"delta\":{\"content\":\"Hello\"},\"finish_reason\":null}]}\n\n\
data: {\"choices\":[{\"delta\":{\"content\":\" world\"},\"finish_reason\":null}]}\n\n\
data: {\"choices\":[{\"delta\":{\"content\":\"\"},\"finish_reason\":\"stop\"}]}\n\n\
data: [DONE]\n\n";

        let mock = server
            .mock("POST", "/chat/completions")
            .with_status(200)
            .with_header("content-type", "text/event-stream")
            .with_body(sse_body)
            .create_async()
            .await;

        let settings = make_settings(&server.url());
        let client = build_client(10);
        let agent = AgentService::new(client);

        let (tx, mut rx) = mpsc::channel::<String>(64);
        let cancel = CancellationToken::new();

        let result = agent.solve("test question", &settings, tx, cancel).await;
        mock.assert_async().await;

        assert!(result.is_ok(), "Expected Ok, got: {:?}", result);
        let full = result.unwrap();
        assert!(full.contains("Hello") || full.contains("world"),
            "Expected content in result, got: {}", full);
    }

    #[tokio::test]
    async fn test_openai_error_response() {
        let mut server = Server::new_async().await;

        let mock = server
            .mock("POST", "/chat/completions")
            .with_status(401)
            .with_body(r#"{"error":{"message":"Invalid API key"}}"#)
            .create_async()
            .await;

        let settings = make_settings(&server.url());
        let client = build_client(10);
        let agent = AgentService::new(client);

        let (tx, _rx) = mpsc::channel::<String>(64);
        let cancel = CancellationToken::new();

        let result = agent.solve("test", &settings, tx, cancel).await;
        mock.assert_async().await;

        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(err_msg.contains("401") || err_msg.contains("AI error"));
    }

    #[tokio::test]
    async fn test_cancellation() {
        let mut server = Server::new_async().await;

        // Simulate slow response
        let sse_body = "data: {\"choices\":[{\"delta\":{\"content\":\"Starting...\"},\"finish_reason\":null}]}\n\n";

        let mock = server
            .mock("POST", "/chat/completions")
            .with_status(200)
            .with_header("content-type", "text/event-stream")
            .with_body(sse_body)
            .create_async()
            .await;

        let settings = make_settings(&server.url());
        let client = build_client(10);
        let agent = AgentService::new(client);

        let (tx, _rx) = mpsc::channel::<String>(64);
        let cancel = CancellationToken::new();
        cancel.cancel(); // cancel immediately

        let result = agent.solve("test", &settings, tx, cancel).await;
        assert!(matches!(result, Err(text_ai_plugin_lib::AppError::Cancelled)));
    }
}
