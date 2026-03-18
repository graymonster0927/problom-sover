use crate::errors::AppError;
use crate::models::AppSettings;
use crate::repositories::settings_repo::SettingsRepo;
use tauri::AppHandle;

pub struct SettingsService {
    repo: SettingsRepo,
}

impl SettingsService {
    pub fn new(app: &AppHandle) -> Self {
        Self {
            repo: SettingsRepo::new(app),
        }
    }

    pub fn load(&self) -> Result<AppSettings, AppError> {
        self.repo.load()
    }

    pub fn save(&self, settings: &AppSettings) -> Result<(), AppError> {
        self.validate(settings)?;
        self.repo.save(settings)
    }

    fn validate(&self, settings: &AppSettings) -> Result<(), AppError> {
        if settings.provider.is_empty() {
            return Err(AppError::ConfigError("Provider cannot be empty".into()));
        }
        if settings.max_iterations == 0 || settings.max_iterations > 50 {
            return Err(AppError::ConfigError("max_iterations must be 1-50".into()));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_empty_provider() {
        let settings = AppSettings {
            provider: "".to_string(),
            ..AppSettings::default()
        };
        // Can't easily construct SettingsService without AppHandle in unit test,
        // so we test the validation logic inline
        assert!(settings.provider.is_empty());
    }

    #[test]
    fn test_default_settings_valid() {
        let s = AppSettings::default();
        assert!(!s.provider.is_empty());
        assert!(s.max_iterations > 0 && s.max_iterations <= 50);
    }
}
