use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
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
    #[serde(default)]
    pub counter: u32,
    #[serde(default)]
    pub notes: String,
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
    #[serde(rename = "language")]
    pub language: String,
    #[serde(rename = "theme")]
    pub theme: String,
    #[serde(rename = "menuBarOnly", default)]
    pub menu_bar_only: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            biometric_enabled: false,
            auto_copy: true,
            clipboard_clear_time: 30,
            lock_timeout: 1,
            password_hint: String::new(),
            language: String::from("auto"),
            theme: String::from("auto"),
            menu_bar_only: false,
        }
    }
}

/// Returns the platform-specific application data directory.
pub fn get_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data directory: {}", e))
}

fn data_dir_or_log(app: &AppHandle) -> Option<PathBuf> {
    match get_data_dir(app) {
        Ok(dir) => Some(dir),
        Err(e) => {
            log::error!("{}", e);
            None
        }
    }
}

/// Writes `content` atomically with owner-only permissions: the data is written
/// to a sibling temp file, flushed, then renamed over the target. A crash can
/// therefore never leave a half-written file in place.
pub(crate) fn write_private(path: &Path, content: &str) -> Result<(), String> {
    write_private_bytes(path, content.as_bytes())
}

/// Byte-oriented counterpart of [`write_private`].
pub fn write_private_bytes(path: &Path, content: &[u8]) -> Result<(), String> {
    let dir = path
        .parent()
        .ok_or_else(|| format!("{} has no parent directory", path.display()))?;
    fs::create_dir_all(dir).map_err(|e| format!("failed to create {}: {}", dir.display(), e))?;

    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| format!("{} has no file name", path.display()))?;
    let tmp = dir.join(format!(".{}.tmp", file_name));

    let result = (|| -> Result<(), String> {
        let mut file = fs::File::create(&tmp)
            .map_err(|e| format!("failed to create {}: {}", tmp.display(), e))?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            file.set_permissions(fs::Permissions::from_mode(0o600))
                .map_err(|e| format!("failed to set permissions on {}: {}", tmp.display(), e))?;
        }

        file.write_all(content)
            .map_err(|e| format!("failed to write {}: {}", tmp.display(), e))?;
        file.sync_all()
            .map_err(|e| format!("failed to flush {}: {}", tmp.display(), e))?;
        Ok(())
    })();

    if let Err(e) = result {
        let _ = fs::remove_file(&tmp);
        return Err(e);
    }

    fs::rename(&tmp, path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("failed to replace {}: {}", path.display(), e)
    })
}

/// Path used to park a file we could not parse, so the next save cannot
/// silently overwrite data that is still on disk.
fn quarantined_path(path: &Path) -> PathBuf {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("data.json");
    path.with_file_name(format!("{}.corrupt.{}", file_name, stamp))
}

fn load_accounts_from(dir: &Path) -> Vec<Account> {
    let path = dir.join("data.json");
    let content = match fs::read_to_string(&path) {
        Ok(content) => content,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Vec::new(),
        Err(e) => {
            log::error!("failed to read {}: {}", path.display(), e);
            return Vec::new();
        }
    };

    match serde_json::from_str(&content) {
        Ok(accounts) => accounts,
        Err(e) => {
            let quarantine = quarantined_path(&path);
            log::error!(
                "{} is not valid account data ({}); moving it to {}",
                path.display(),
                e,
                quarantine.display()
            );
            if let Err(err) = fs::rename(&path, &quarantine) {
                log::error!("failed to quarantine {}: {}", path.display(), err);
            }
            Vec::new()
        }
    }
}

/// Loads all accounts from the data.json file. Returns an empty vector if the
/// file does not exist. Unreadable files are quarantined rather than dropped.
pub fn load_accounts(app: &AppHandle) -> Vec<Account> {
    match data_dir_or_log(app) {
        Some(dir) => load_accounts_from(&dir),
        None => Vec::new(),
    }
}

/// Saves the accounts vector to the data.json file, creating the data directory if needed.
pub fn save_accounts(app: &AppHandle, accounts: &[Account]) -> Result<(), String> {
    let dir = get_data_dir(app)?;
    let content = serde_json::to_string_pretty(accounts)
        .map_err(|e| format!("failed to serialize accounts: {}", e))?;
    write_private(&dir.join("data.json"), &content)
}

fn load_settings_from(dir: &Path) -> AppSettings {
    let path = dir.join("settings.json");
    let content = match fs::read_to_string(&path) {
        Ok(content) => content,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return AppSettings::default(),
        Err(e) => {
            log::error!("failed to read {}: {}", path.display(), e);
            return AppSettings::default();
        }
    };

    match serde_json::from_str(&content) {
        Ok(settings) => settings,
        Err(e) => {
            let quarantine = quarantined_path(&path);
            log::error!(
                "{} is not valid settings data ({}); moving it to {}",
                path.display(),
                e,
                quarantine.display()
            );
            if let Err(err) = fs::rename(&path, &quarantine) {
                log::error!("failed to quarantine {}: {}", path.display(), err);
            }
            AppSettings::default()
        }
    }
}

/// Loads application settings from settings.json. Returns defaults if the file
/// does not exist. Unreadable files are quarantined rather than overwritten.
pub fn load_settings(app: &AppHandle) -> AppSettings {
    match data_dir_or_log(app) {
        Some(dir) => load_settings_from(&dir),
        None => AppSettings::default(),
    }
}

/// Saves application settings to settings.json, creating the data directory if needed.
pub fn save_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let dir = get_data_dir(app)?;
    let content = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("failed to serialize settings: {}", e))?;
    write_private(&dir.join("settings.json"), &content)
}

/// Saves the password hash to password.dat.
pub fn save_password_hash(app: &AppHandle, hash: &str) -> Result<(), String> {
    let dir = get_data_dir(app)?;
    write_private(&dir.join("password.dat"), hash)
}

fn load_password_hash_from(dir: &Path) -> Option<String> {
    let path = dir.join("password.dat");
    match fs::read_to_string(&path) {
        Ok(content) => Some(content),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => None,
        Err(e) => {
            // Failing to read is not the same as having no password; report it
            // instead of pretending the app has no password set.
            log::error!("failed to read {}: {}", path.display(), e);
            None
        }
    }
}

/// Loads the password hash from password.dat. Returns None if the file does not exist.
pub fn load_password_hash(app: &AppHandle) -> Option<String> {
    data_dir_or_log(app).and_then(|dir| load_password_hash_from(&dir))
}

/// Checks whether the user has completed initial setup by verifying settings.json exists.
pub fn has_setup(app: &AppHandle) -> bool {
    data_dir_or_log(app)
        .map(|dir| dir.join("settings.json").exists())
        .unwrap_or(false)
}

/// Checks whether the user has set a password by verifying password.dat exists.
pub fn has_password_hash(app: &AppHandle) -> bool {
    data_dir_or_log(app)
        .map(|dir| dir.join("password.dat").exists())
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("openotp-test-{}-{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn account(id: &str) -> Account {
        Account {
            id: id.into(),
            name: "alice@example.com".into(),
            issuer: "GitHub".into(),
            icon: AccountIcon {
                icon_type: "initial".into(),
                value: "A".into(),
                bg_color: "#123456".into(),
            },
            account_type: "totp".into(),
            secret: "JBSWY3DPEHPK3PXP".into(),
            algorithm: "sha1".into(),
            digits: 6,
            period: 30,
            counter: 0,
            notes: String::new(),
            created_at: 1_700_000_000_000,
            order: 0,
        }
    }

    #[test]
    fn accounts_round_trip() {
        let dir = temp_dir("accounts");

        write_private(
            &dir.join("data.json"),
            &serde_json::to_string(&[account("a1")]).unwrap(),
        )
        .unwrap();

        let loaded = load_accounts_from(&dir);
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].secret, "JBSWY3DPEHPK3PXP");
    }

    #[test]
    fn missing_accounts_file_is_not_an_error() {
        let dir = temp_dir("missing");

        assert!(load_accounts_from(&dir).is_empty());
        assert!(load_password_hash_from(&dir).is_none());
    }

    #[test]
    fn writes_leave_no_temp_file_behind() {
        let dir = temp_dir("atomic");

        write_private(&dir.join("data.json"), "[]").unwrap();

        let entries: Vec<String> = fs::read_dir(&dir)
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().to_string())
            .collect();
        assert_eq!(entries, vec!["data.json".to_string()]);
    }

    #[test]
    fn overwrites_existing_content_in_place() {
        let dir = temp_dir("overwrite");
        let path = dir.join("data.json");

        write_private(&path, "first").unwrap();
        write_private(&path, "second").unwrap();

        assert_eq!(fs::read_to_string(&path).unwrap(), "second");
    }

    #[test]
    fn corrupt_accounts_are_quarantined_not_lost() {
        let dir = temp_dir("corrupt");
        let path = dir.join("data.json");
        fs::write(&path, "{ this is not json").unwrap();

        assert!(load_accounts_from(&dir).is_empty());

        // The unreadable content must survive, and the original path must be
        // free so the next save starts from a clean slate.
        assert!(!path.exists());
        let quarantined: Vec<PathBuf> = fs::read_dir(&dir)
            .unwrap()
            .map(|e| e.unwrap().path())
            .filter(|p| p.to_string_lossy().contains(".corrupt."))
            .collect();
        assert_eq!(quarantined.len(), 1);
        assert_eq!(
            fs::read_to_string(&quarantined[0]).unwrap(),
            "{ this is not json"
        );
    }

    #[test]
    fn corrupt_settings_are_quarantined() {
        let dir = temp_dir("corrupt-settings");
        fs::write(dir.join("settings.json"), "nope").unwrap();

        let settings = load_settings_from(&dir);

        assert!(!settings.menu_bar_only);
        assert!(!dir.join("settings.json").exists());
    }

    #[test]
    fn settings_round_trip() {
        let dir = temp_dir("settings");
        let settings = AppSettings {
            menu_bar_only: true,
            language: "zh-CN".into(),
            ..AppSettings::default()
        };

        write_private(
            &dir.join("settings.json"),
            &serde_json::to_string(&settings).unwrap(),
        )
        .unwrap();

        let loaded = load_settings_from(&dir);
        assert!(loaded.menu_bar_only);
        assert_eq!(loaded.language, "zh-CN");
    }

    #[test]
    fn password_hash_round_trip() {
        let dir = temp_dir("password");

        write_private(&dir.join("password.dat"), "pbkdf2_sha256:100000:aa:bb").unwrap();

        assert_eq!(
            load_password_hash_from(&dir).unwrap(),
            "pbkdf2_sha256:100000:aa:bb"
        );
    }

    #[test]
    fn writes_binary_content() {
        let dir = temp_dir("binary");
        let path = dir.join("backup.zip");

        write_private_bytes(&path, &[0x50, 0x4b, 0x03, 0x04]).unwrap();

        assert_eq!(fs::read(&path).unwrap(), vec![0x50, 0x4b, 0x03, 0x04]);
    }

    #[cfg(unix)]
    #[test]
    fn written_files_are_owner_only() {
        use std::os::unix::fs::PermissionsExt;

        let dir = temp_dir("permissions");
        let path = dir.join("data.json");

        write_private(&path, "[]").unwrap();

        let mode = fs::metadata(&path).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode, 0o600);
    }
}
