use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

const EXPIRY_SECONDS: i64 = 1800;

#[derive(Debug, Serialize, Deserialize)]
pub struct BiometricStatusData {
    pub failure_count: u32,
    pub last_failure_time: Option<i64>,
    pub expires_at: Option<i64>,
}

impl Default for BiometricStatusData {
    fn default() -> Self {
        Self {
            failure_count: 0,
            last_failure_time: None,
            expires_at: None,
        }
    }
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
            .unwrap_or_else(|_| PathBuf::from("."))
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

    pub fn can_use(&self) -> bool {
        if self.data.failure_count < 3 {
            return true;
        }
        if let Some(expires) = self.data.expires_at {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;
            return now > expires;
        }
        false
    }

    pub fn record_failure(&mut self) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        
        self.data.failure_count += 1;
        self.data.last_failure_time = Some(now);
        self.data.expires_at = Some(now + EXPIRY_SECONDS);
        self.save();
    }

    pub fn reset(&mut self) {
        self.data = BiometricStatusData::default();
        self.save();
    }

    fn save(&self) {
        if let Some(parent) = self.path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let _ = fs::write(&self.path, serde_json::to_string_pretty(&self.data).unwrap_or_default());
    }
}