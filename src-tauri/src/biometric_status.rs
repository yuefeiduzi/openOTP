use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

const EXPIRY_SECONDS: i64 = 1800;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct BiometricStatusData {
    pub failure_count: u32,
    pub last_failure_time: Option<i64>,
    pub expires_at: Option<i64>,
}

pub struct BiometricStatus {
    data: BiometricStatusData,
    path: PathBuf,
}

impl BiometricStatus {
    pub fn load(app: &AppHandle) -> Self {
        let path = app
            .path()
            .app_config_dir()
            .unwrap_or_else(|e| {
                log::error!("failed to resolve app config directory: {}; using cwd", e);
                PathBuf::from(".")
            })
            .join("biometric_status.json");

        let data = if path.exists() {
            fs::read_to_string(&path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            BiometricStatusData::default()
        };

        Self { data, path }
    }

    pub fn failure_count(&self) -> u32 {
        self.data.failure_count
    }

    pub fn last_failure_time(&self) -> Option<i64> {
        self.data.last_failure_time
    }

    pub fn can_use(&self) -> bool {
        if self.data.failure_count < 3 {
            return true;
        }
        if let Some(expires) = self.data.expires_at {
            let now = now_epoch_seconds();
            return now > expires;
        }
        false
    }

    pub fn record_failure(&mut self) {
        let now = now_epoch_seconds();

        self.data.failure_count += 1;
        self.data.last_failure_time = Some(now);
        self.data.expires_at = Some(now + EXPIRY_SECONDS);
        self.save();
    }

    pub fn reset(&mut self) {
        self.data = BiometricStatusData::default();
        self.save();
    }

    /// Persists the failure state. Failures are logged rather than ignored: if
    /// this write is lost the lockout can be escaped by restarting the app.
    fn save(&self) {
        let content = match serde_json::to_string_pretty(&self.data) {
            Ok(content) => content,
            Err(e) => {
                log::error!("failed to serialize biometric status: {}", e);
                return;
            }
        };

        if let Err(e) = crate::storage::write_private(&self.path, &content) {
            log::error!("failed to persist biometric status: {}", e);
        }
    }
}

fn now_epoch_seconds() -> i64 {
    match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        Ok(duration) => duration.as_secs() as i64,
        Err(_) => 0,
    }
}