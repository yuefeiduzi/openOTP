use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountIcon {
    #[serde(rename = "type")]
    pub icon_type: String,
    pub value: String,
    #[serde(rename = "bgColor")]
    pub bg_color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub issuer: String,
    pub icon: AccountIcon,
    #[serde(rename = "type")]
    pub account_type: String,
    pub secret: String,
    pub algorithm: String,
    pub digits: u8,
    pub period: u32,
    pub counter: u32,
    #[serde(rename = "createdAt")]
    pub created_at: u64,
    pub order: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    #[serde(rename = "biometricEnabled")]
    pub biometric_enabled: bool,
    #[serde(rename = "autoCopy")]
    pub auto_copy: bool,
    #[serde(rename = "clipboardClearTime")]
    pub clipboard_clear_time: u32,
    #[serde(rename = "lockTimeout")]
    pub lock_timeout: u32,
    #[serde(rename = "passwordHint")]
    pub password_hint: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            biometric_enabled: false,
            auto_copy: true,
            clipboard_clear_time: 30,
            lock_timeout: 60,
            password_hint: String::new(),
        }
    }
}

/// Returns the platform-specific application data directory.
pub fn get_data_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to resolve app data directory")
}

/// Loads all accounts from the data.json file. Returns an empty vector if the file does not exist or is corrupted.
pub fn load_accounts(app: &AppHandle) -> Vec<Account> {
    let path = get_data_dir(app).join("data.json");
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

/// Saves the accounts vector to the data.json file, creating the data directory if needed.
pub fn save_accounts(app: &AppHandle, accounts: &[Account]) -> Result<(), String> {
    let dir = get_data_dir(app);
    fs::create_dir_all(&dir)
        .map_err(|e| format!("failed to create data directory: {}", e))?;
    let path = dir.join("data.json");
    let content = serde_json::to_string_pretty(accounts)
        .map_err(|e| format!("failed to serialize accounts: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("failed to write data.json: {}", e))?;
    Ok(())
}

/// Loads application settings from settings.json. Returns defaults if the file does not exist or is corrupted.
pub fn load_settings(app: &AppHandle) -> AppSettings {
    let path = get_data_dir(app).join("settings.json");
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => AppSettings::default(),
    }
}

/// Saves application settings to settings.json, creating the data directory if needed.
pub fn save_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let dir = get_data_dir(app);
    fs::create_dir_all(&dir)
        .map_err(|e| format!("failed to create data directory: {}", e))?;
    let path = dir.join("settings.json");
    let content = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("failed to serialize settings: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("failed to write settings.json: {}", e))?;
    Ok(())
}

/// Saves the password hash to password.dat.
pub fn save_password_hash(app: &AppHandle, hash: &str) -> Result<(), String> {
    let dir = get_data_dir(app);
    fs::create_dir_all(&dir)
        .map_err(|e| format!("failed to create data directory: {}", e))?;
    let path = dir.join("password.dat");
    fs::write(&path, hash).map_err(|e| format!("failed to write password.dat: {}", e))?;
    Ok(())
}

/// Loads the password hash from password.dat. Returns None if the file does not exist.
pub fn load_password_hash(app: &AppHandle) -> Option<String> {
    let path = get_data_dir(app).join("password.dat");
    fs::read_to_string(&path).ok()
}

/// Checks whether the user has completed initial setup by verifying password.dat exists.
pub fn has_setup(app: &AppHandle) -> bool {
    get_data_dir(app).join("password.dat").exists()
}
