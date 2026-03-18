use crate::errors::AppError;
use crate::models::HistoryRecord;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub struct HistoryRepo {
    path: PathBuf,
}

impl HistoryRepo {
    pub fn new(app: &AppHandle) -> Self {
        let mut path = app
            .path()
            .app_data_dir()
            .expect("Failed to get app data dir");
        std::fs::create_dir_all(&path).ok();
        path.push("history.json");
        Self { path }
    }

    /// Create with explicit path (useful for testing)
    pub fn with_path(path: PathBuf) -> Self {
        Self { path }
    }

    /// Append a new record to the history file
    pub fn append(&self, record: &HistoryRecord) -> Result<(), AppError> {
        let mut records = self.load_all()?;
        records.push(record.clone());
        let json = serde_json::to_string_pretty(&records)?;
        std::fs::write(&self.path, json)?;
        Ok(())
    }

    /// Load all records (newest first), optionally paginated
    pub fn list(&self, page: usize, per_page: usize) -> Result<Vec<HistoryRecord>, AppError> {
        let mut all = self.load_all()?;
        all.reverse();
        let start = page * per_page;
        if start >= all.len() {
            return Ok(vec![]);
        }
        Ok(all[start..std::cmp::min(start + per_page, all.len())].to_vec())
    }

    /// Clear all history
    pub fn clear(&self) -> Result<(), AppError> {
        std::fs::write(&self.path, "[]")?;
        Ok(())
    }

    fn load_all(&self) -> Result<Vec<HistoryRecord>, AppError> {
        if !self.path.exists() {
            return Ok(vec![]);
        }
        let content = std::fs::read_to_string(&self.path)?;
        let records: Vec<HistoryRecord> = serde_json::from_str(&content)?;
        Ok(records)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn make_repo(dir: &std::path::Path) -> HistoryRepo {
        let path = dir.join("history.json");
        HistoryRepo { path }
    }

    fn sample_record(n: u32) -> HistoryRecord {
        HistoryRecord {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            input_text: format!("Question {}", n),
            ai_result: format!("Answer {}", n),
            provider: "openai".to_string(),
        }
    }

    #[test]
    fn test_append_and_list() {
        let dir = tempdir().unwrap();
        let repo = make_repo(dir.path());

        let r1 = sample_record(1);
        let r2 = sample_record(2);
        repo.append(&r1).unwrap();
        repo.append(&r2).unwrap();

        let records = repo.list(0, 10).unwrap();
        assert_eq!(records.len(), 2);
        // newest first
        assert_eq!(records[0].input_text, "Question 2");
    }

    #[test]
    fn test_list_empty() {
        let dir = tempdir().unwrap();
        let repo = make_repo(dir.path());
        let records = repo.list(0, 10).unwrap();
        assert!(records.is_empty());
    }

    #[test]
    fn test_clear() {
        let dir = tempdir().unwrap();
        let repo = make_repo(dir.path());
        repo.append(&sample_record(1)).unwrap();
        repo.clear().unwrap();
        let records = repo.list(0, 10).unwrap();
        assert!(records.is_empty());
    }

    #[test]
    fn test_pagination() {
        let dir = tempdir().unwrap();
        let repo = make_repo(dir.path());
        for i in 0..15 {
            repo.append(&sample_record(i)).unwrap();
        }
        let page0 = repo.list(0, 10).unwrap();
        let page1 = repo.list(1, 10).unwrap();
        assert_eq!(page0.len(), 10);
        assert_eq!(page1.len(), 5);
    }
}
