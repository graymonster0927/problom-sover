/// Integration tests for settings and history repositories
#[cfg(test)]
mod tests {
    use tempfile::tempdir;
    use text_ai_plugin_lib::models::{AppSettings, HistoryRecord};

    fn make_history_repo(dir: &std::path::Path) -> text_ai_plugin_lib::repositories::history_repo::HistoryRepo {
        // Use the path-based constructor for testing
        text_ai_plugin_lib::repositories::history_repo::HistoryRepo::with_path(
            dir.join("history.json")
        )
    }

    fn make_settings_repo(dir: &std::path::Path) -> text_ai_plugin_lib::repositories::settings_repo::SettingsRepo {
        text_ai_plugin_lib::repositories::settings_repo::SettingsRepo::with_path(
            dir.join("settings.json")
        )
    }

    #[test]
    fn test_settings_roundtrip() {
        let dir = tempdir().unwrap();
        let repo = make_settings_repo(dir.path());

        let mut settings = AppSettings::default();
        settings.api_key = "sk-integration-test".to_string();
        settings.model = "claude-3-5-sonnet-20241022".to_string();
        settings.provider = "anthropic".to_string();

        repo.save(&settings).unwrap();
        let loaded = repo.load().unwrap();

        assert_eq!(loaded.api_key, "sk-integration-test");
        assert_eq!(loaded.model, "claude-3-5-sonnet-20241022");
        assert_eq!(loaded.provider, "anthropic");
    }

    #[test]
    fn test_history_append_list_clear() {
        let dir = tempdir().unwrap();
        let repo = make_history_repo(dir.path());

        for i in 0..5 {
            let record = HistoryRecord {
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: chrono::Utc::now().to_rfc3339(),
                input_text: format!("Question {}", i),
                ai_result: format!("Answer {}", i),
                provider: "openai".to_string(),
            };
            repo.append(&record).unwrap();
        }

        let page0 = repo.list(0, 3).unwrap();
        assert_eq!(page0.len(), 3);

        let page1 = repo.list(1, 3).unwrap();
        assert_eq!(page1.len(), 2);

        repo.clear().unwrap();
        let empty = repo.list(0, 10).unwrap();
        assert!(empty.is_empty());
    }

    #[test]
    fn test_history_newest_first_ordering() {
        let dir = tempdir().unwrap();
        let repo = make_history_repo(dir.path());

        for i in 0..3 {
            let record = HistoryRecord {
                id: uuid::Uuid::new_v4().to_string(),
                timestamp: chrono::Utc::now().to_rfc3339(),
                input_text: format!("Q{}", i),
                ai_result: format!("A{}", i),
                provider: "openai".to_string(),
            };
            repo.append(&record).unwrap();
        }

        let records = repo.list(0, 10).unwrap();
        // newest first: Q2 should be at index 0
        assert_eq!(records[0].input_text, "Q2");
        assert_eq!(records[2].input_text, "Q0");
    }
}
