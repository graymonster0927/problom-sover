use crate::errors::AppError;
use crate::models::AppSettings;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub struct SettingsRepo {
    path: PathBuf,
}

impl SettingsRepo {
    pub fn new(app: &AppHandle) -> Self {
        let mut path = app
            .path()
            .app_data_dir()
            .expect("Failed to get app data dir");
        std::fs::create_dir_all(&path).ok();
        path.push("settings.json");
        Self { path }
    }

    /// Create with explicit path (useful for testing)
    pub fn with_path(path: PathBuf) -> Self {
        Self { path }
    }

    pub fn load_or_default(app: &AppHandle) -> Result<AppSettings, AppError> {
        let repo = Self::new(app);
        repo.load()
    }

    pub fn load(&self) -> Result<AppSettings, AppError> {
        if !self.path.exists() {
            return Ok(AppSettings::default());
        }
        let content = std::fs::read_to_string(&self.path)?;
        let settings: AppSettings = serde_json::from_str(&content).unwrap_or_default();
        Ok(settings)
    }

    pub fn save(&self, settings: &AppSettings) -> Result<(), AppError> {
        let json = serde_json::to_string_pretty(settings)?;
        std::fs::write(&self.path, json)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn make_repo(dir: &std::path::Path) -> SettingsRepo {
        SettingsRepo {
            path: dir.join("settings.json"),
        }
    }

    #[test]
    fn test_default_when_missing() {
        let dir = tempdir().unwrap();
        let repo = make_repo(dir.path());
        let settings = repo.load().unwrap();
        assert_eq!(settings.provider, "openai");
    }

    #[test]
    fn test_save_and_load() {
        let dir = tempdir().unwrap();
        let repo = make_repo(dir.path());
        let mut s = AppSettings::default();
        s.api_key = "sk-test-key".to_string();
        s.model = "gpt-4-turbo".to_string();
        repo.save(&s).unwrap();

        let loaded = repo.load().unwrap();
        assert_eq!(loaded.api_key, "sk-test-key");
        assert_eq!(loaded.model, "gpt-4-turbo");
    }

    #[test]
    fn test_save_overwrite() {
        let dir = tempdir().unwrap();
        let repo = make_repo(dir.path());
        let mut s = AppSettings::default();
        s.api_key = "key1".to_string();
        repo.save(&s).unwrap();
        s.api_key = "key2".to_string();
        repo.save(&s).unwrap();
        let loaded = repo.load().unwrap();
        assert_eq!(loaded.api_key, "key2");
    }
}
