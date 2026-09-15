//! Backup container format.
//!
//! A backup is a plain zip archive:
//!
//! ```text
//! manifest.json        container metadata, never encrypted
//! accounts.json        the account list
//! icons/<id>.<ext>     uploaded icon images, one file per account
//! ```
//!
//! `accounts.json` and the icon entries are AES-256 encrypted when a password is
//! given, which makes the file usable with any zip tool (7-Zip, Keka, …) and
//! keeps the container independent of this application. `manifest.json` stays
//! readable so the import flow can tell whether a password is needed before
//! asking for one.
//!
//! Note on strength: zip's AES mode derives its key with PBKDF2-HMAC-SHA1 and a
//! fixed 1000 iterations (WinZip AE-2), which is weak by modern standards. The
//! UI therefore requires a real password rather than a 6-digit PIN.

use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Cursor, Read, Write};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use zip::write::SimpleFileOptions;
use zip::{AesMode, CompressionMethod, DateTime, ZipArchive, ZipWriter};

use crate::storage::{write_private_bytes, Account};

pub const FORMAT: &str = "openotp-backup";
pub const FORMAT_VERSION: u32 = 1;

const MANIFEST_FILE: &str = "manifest.json";
const ACCOUNTS_FILE: &str = "accounts.json";
const ICONS_DIR: &str = "icons";
const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupManifest {
    pub format: String,
    #[serde(rename = "formatVersion")]
    pub format_version: u32,
    #[serde(rename = "appVersion")]
    pub app_version: String,
    #[serde(rename = "createdAt")]
    pub created_at: u64,
    #[serde(rename = "accountCount")]
    pub account_count: usize,
    pub encrypted: bool,
}

#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub manifest: BackupManifest,
    pub accounts: Vec<Account>,
}

/// Image formats we can round-trip. Everything else is stored with a `.bin`
/// suffix and restored as a PNG data URL.
const IMAGE_TYPES: &[(&str, &str)] = &[
    ("image/png", "png"),
    ("image/jpeg", "jpg"),
    ("image/gif", "gif"),
    ("image/webp", "webp"),
    ("image/svg+xml", "svg"),
    ("image/bmp", "bmp"),
    ("image/x-icon", "ico"),
];

fn extension_for_mime(mime: &str) -> &'static str {
    IMAGE_TYPES
        .iter()
        .find(|(known, _)| *known == mime)
        .map(|(_, ext)| *ext)
        .unwrap_or("bin")
}

fn mime_for_extension(extension: &str) -> &'static str {
    IMAGE_TYPES
        .iter()
        .find(|(_, ext)| *ext == extension)
        .map(|(mime, _)| *mime)
        .unwrap_or("image/png")
}

fn sanitize_file_stem(id: &str) -> String {
    let cleaned: String = id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();

    if cleaned.is_empty() {
        "icon".to_string()
    } else {
        cleaned
    }
}

fn unix_seconds_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Converts a unix timestamp to a zip timestamp.
///
/// Zip stores local time without a zone, so the value is interpreted as UTC.
/// Implemented here rather than pulled in through the `time` feature.
fn zip_datetime(unix_seconds: u64) -> DateTime {
    let days = (unix_seconds / 86_400) as i64;
    let seconds_of_day = unix_seconds % 86_400;

    // Howard Hinnant's civil_from_days.
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let day_of_era = z.rem_euclid(146_097);
    let year_of_era =
        (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let mp = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if month <= 2 { year + 1 } else { year };

    DateTime::from_date_and_time(
        year.clamp(1980, 2107) as u16,
        month as u8,
        day as u8,
        (seconds_of_day / 3600) as u8,
        ((seconds_of_day % 3600) / 60) as u8,
        (seconds_of_day % 60) as u8,
    )
    .unwrap_or_default()
}

/// Splits a `data:` URL into its mime type and raw bytes.
fn decode_data_url(value: &str) -> Option<(&str, Vec<u8>)> {
    let rest = value.strip_prefix("data:")?;
    let (meta, payload) = rest.split_once(',')?;
    if !meta.ends_with(";base64") {
        return None;
    }
    let mime = meta.trim_end_matches(";base64");
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(payload)
        .ok()?;
    Some((mime, bytes))
}

fn encode_data_url(mime: &str, bytes: &[u8]) -> String {
    format!(
        "data:{};base64,{}",
        mime,
        base64::engine::general_purpose::STANDARD.encode(bytes)
    )
}

/// Moves an uploaded icon out of the account JSON and into its own entry.
/// Returns the account to serialise plus the icon file to write, if any.
fn split_icon(account: &Account) -> (Account, Option<(String, Vec<u8>)>) {
    if account.icon.icon_type != "image" {
        return (account.clone(), None);
    }

    let Some((mime, bytes)) = decode_data_url(&account.icon.value) else {
        // Not a base64 data URL — keep whatever is there untouched.
        return (account.clone(), None);
    };

    let file_name = format!(
        "{}/{}.{}",
        ICONS_DIR,
        sanitize_file_stem(&account.id),
        extension_for_mime(mime)
    );

    let mut stripped = account.clone();
    stripped.icon.value = file_name.clone();

    (stripped, Some((file_name, bytes)))
}

/// Reads the manifest without needing the password.
pub fn inspect(path: &Path) -> Result<BackupManifest, String> {
    let file = fs::File::open(path).map_err(|e| format!("failed to open backup: {}", e))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("not a valid backup archive: {}", e))?;

    let manifest = read_entry(&mut archive, MANIFEST_FILE, None)?;
    let manifest: BackupManifest = serde_json::from_slice(&manifest)
        .map_err(|e| format!("invalid backup manifest: {}", e))?;

    validate_manifest(&manifest)?;

    Ok(manifest)
}

fn validate_manifest(manifest: &BackupManifest) -> Result<(), String> {
    if manifest.format != FORMAT {
        return Err(format!("unexpected backup format: {}", manifest.format));
    }
    if manifest.format_version > FORMAT_VERSION {
        return Err(format!(
            "backup format {} is newer than this app supports ({})",
            manifest.format_version, FORMAT_VERSION
        ));
    }
    Ok(())
}

fn read_entry<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
    name: &str,
    password: Option<&str>,
) -> Result<Vec<u8>, String> {
    let mut file = match password {
        Some(password) => archive
            .by_name_decrypt(name, password.as_bytes())
            .map_err(|_| format!("failed to open \"{}\": wrong password or corrupt archive", name))?,
        None => archive
            .by_name(name)
            .map_err(|e| format!("missing \"{}\" in backup: {}", name, e))?,
    };

    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| format!("failed to read \"{}\": {}", name, e))?;
    Ok(buffer)
}

/// Reads a backup, decrypting it when a password is supplied.
pub fn import(path: &Path, password: Option<&str>) -> Result<ImportResult, String> {
    let manifest = inspect(path)?;

    if manifest.encrypted && password.is_none() {
        return Err("this backup is encrypted: a password is required".to_string());
    }

    let file = fs::File::open(path).map_err(|e| format!("failed to open backup: {}", e))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("not a valid backup archive: {}", e))?;

    let payload = read_entry(&mut archive, ACCOUNTS_FILE, password)?;
    let accounts: Vec<Account> =
        serde_json::from_slice(&payload).map_err(|e| format!("invalid account data: {}", e))?;

    let mut restored = Vec::with_capacity(accounts.len());
    for account in accounts {
        restored.push(rehydrate_icon(&mut archive, account, password)?);
    }

    Ok(ImportResult {
        manifest,
        accounts: restored,
    })
}

/// Restores an icon stored as a file inside the archive back into a data URL.
fn rehydrate_icon<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
    account: Account,
    password: Option<&str>,
) -> Result<Account, String> {
    let mut account = account;

    if account.icon.icon_type != "image" || !account.icon.value.starts_with(&format!("{}/", ICONS_DIR))
    {
        return Ok(account);
    }

    let file_name = account.icon.value.clone();
    let bytes = read_entry(archive, &file_name, password)?;

    let extension = Path::new(&file_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");

    account.icon.value = encode_data_url(mime_for_extension(extension), &bytes);

    Ok(account)
}

/// Writes a backup, encrypting it when a password is supplied.
pub fn export(
    path: &Path,
    accounts: &[Account],
    password: Option<&str>,
) -> Result<BackupManifest, String> {
    let mut stripped_accounts = Vec::with_capacity(accounts.len());
    let mut icons: Vec<(String, Vec<u8>)> = Vec::new();

    for account in accounts {
        let (stripped, icon) = split_icon(account);
        if let Some(icon) = icon {
            icons.push(icon);
        }
        stripped_accounts.push(stripped);
    }

    let manifest = BackupManifest {
        format: FORMAT.to_string(),
        format_version: FORMAT_VERSION,
        app_version: APP_VERSION.to_string(),
        created_at: unix_seconds_now(),
        account_count: accounts.len(),
        encrypted: password.is_some(),
    };

    let timestamp = zip_datetime(manifest.created_at);
    let payload_options = match password {
        Some(password) => SimpleFileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .last_modified_time(timestamp)
            .with_aes_encryption(AesMode::Aes256, password),
        None => SimpleFileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .last_modified_time(timestamp),
    };
    // The manifest stays readable so `inspect` can report whether a password is
    // needed before the user is asked for one.
    let manifest_options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .last_modified_time(timestamp);

    let mut buffer = Vec::new();
    {
        let mut writer = ZipWriter::new(Cursor::new(&mut buffer));

        let manifest_json = serde_json::to_vec_pretty(&manifest)
            .map_err(|e| format!("failed to serialize manifest: {}", e))?;
        writer
            .start_file(MANIFEST_FILE, manifest_options)
            .map_err(|e| format!("failed to write backup: {}", e))?;
        writer
            .write_all(&manifest_json)
            .map_err(|e| format!("failed to write backup: {}", e))?;

        let accounts_json = serde_json::to_vec_pretty(&stripped_accounts)
            .map_err(|e| format!("failed to serialize accounts: {}", e))?;
        writer
            .start_file(ACCOUNTS_FILE, payload_options)
            .map_err(|e| format!("failed to write backup: {}", e))?;
        writer
            .write_all(&accounts_json)
            .map_err(|e| format!("failed to write backup: {}", e))?;

        for (file_name, bytes) in &icons {
            writer
                .start_file(file_name.as_str(), payload_options)
                .map_err(|e| format!("failed to write backup: {}", e))?;
            writer
                .write_all(bytes)
                .map_err(|e| format!("failed to write backup: {}", e))?;
        }

        writer
            .finish()
            .map_err(|e| format!("failed to finish backup: {}", e))?;
    }

    write_private_bytes(path, &buffer)?;

    Ok(manifest)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::AccountIcon;

    const PNG_DATA_URL: &str = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

    fn temp_dir(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("openotp-backup-{}-{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn account(id: &str, icon: AccountIcon) -> Account {
        Account {
            id: id.into(),
            name: "alice@example.com".into(),
            issuer: "GitHub".into(),
            icon,
            account_type: "totp".into(),
            secret: "JBSWY3DPEHPK3PXP".into(),
            algorithm: "sha1".into(),
            digits: 6,
            period: 30,
            counter: 0,
            notes: "note".into(),
            created_at: 1_700_000_000_000,
            order: 0,
        }
    }

    fn initial_icon() -> AccountIcon {
        AccountIcon {
            icon_type: "initial".into(),
            value: "A".into(),
            bg_color: "#123456".into(),
        }
    }

    fn image_icon() -> AccountIcon {
        AccountIcon {
            icon_type: "image".into(),
            value: PNG_DATA_URL.into(),
            bg_color: String::new(),
        }
    }

    #[test]
    fn round_trips_accounts_and_secrets() {
        let path = temp_dir("plain").join("backup.zip");
        let accounts = vec![account("a1", initial_icon())];

        let manifest = export(&path, &accounts, None).unwrap();
        assert!(!manifest.encrypted);
        assert_eq!(manifest.account_count, 1);

        let result = import(&path, None).unwrap();
        assert_eq!(result.accounts.len(), 1);
        assert_eq!(result.accounts[0].secret, "JBSWY3DPEHPK3PXP");
        assert_eq!(result.accounts[0].notes, "note");
        assert_eq!(result.manifest.format, FORMAT);
    }

    #[test]
    fn round_trips_uploaded_icons_as_files() {
        let path = temp_dir("icons").join("backup.zip");
        let accounts = vec![account("a1", image_icon())];

        export(&path, &accounts, None).unwrap();

        // The icon lives in its own entry, not inline in the JSON.
        let file = fs::File::open(&path).unwrap();
        let mut archive = ZipArchive::new(file).unwrap();
        let names: Vec<String> = (0..archive.len())
            .map(|i| archive.by_index(i).unwrap().name().to_string())
            .collect();
        assert_eq!(
            names,
            vec![
                MANIFEST_FILE.to_string(),
                ACCOUNTS_FILE.to_string(),
                "icons/a1.png".to_string()
            ]
        );

        let result = import(&path, None).unwrap();
        assert_eq!(result.accounts[0].icon.value, PNG_DATA_URL);
    }

    #[test]
    fn round_trips_svg_icons() {
        let path = temp_dir("svg").join("backup.zip");
        let mut icon = image_icon();
        icon.value = "data:image/svg+xml;base64,PHN2Zy8+".into();

        export(&path, &[account("a1", icon)], None).unwrap();
        let result = import(&path, None).unwrap();

        assert_eq!(result.accounts[0].icon.value, "data:image/svg+xml;base64,PHN2Zy8+");
    }

    #[test]
    fn keeps_non_data_url_icons_untouched() {
        let path = temp_dir("raw").join("backup.zip");
        let mut icon = image_icon();
        icon.value = "icon.png".into();

        export(&path, &[account("a1", icon)], None).unwrap();

        let result = import(&path, None).unwrap();
        assert_eq!(result.accounts[0].icon.value, "icon.png");
    }

    #[test]
    fn encrypts_and_decrypts_with_a_password() {
        let path = temp_dir("encrypted").join("backup.zip");
        let accounts = vec![account("a1", image_icon())];

        let manifest = export(&path, &accounts, Some("correct horse battery")).unwrap();
        assert!(manifest.encrypted);

        let result = import(&path, Some("correct horse battery")).unwrap();
        assert_eq!(result.accounts[0].secret, "JBSWY3DPEHPK3PXP");
        assert_eq!(result.accounts[0].icon.value, PNG_DATA_URL);
    }

    #[test]
    fn inspect_reads_the_manifest_without_a_password() {
        let path = temp_dir("inspect").join("backup.zip");
        export(&path, &[account("a1", initial_icon())], Some("password123")).unwrap();

        let manifest = inspect(&path).unwrap();
        assert!(manifest.encrypted);
        assert_eq!(manifest.account_count, 1);
    }

    #[test]
    fn rejects_a_wrong_password() {
        let path = temp_dir("wrong").join("backup.zip");
        export(&path, &[account("a1", initial_icon())], Some("password123")).unwrap();

        let error = import(&path, Some("password124")).unwrap_err();
        assert!(error.contains("wrong password"), "unexpected error: {error}");
    }

    #[test]
    fn requires_a_password_for_encrypted_backups() {
        let path = temp_dir("needs-password").join("backup.zip");
        export(&path, &[account("a1", initial_icon())], Some("password123")).unwrap();

        let error = import(&path, None).unwrap_err();
        assert!(error.contains("password is required"), "unexpected error: {error}");
    }

    #[test]
    fn rejects_unrelated_zips() {
        let path = temp_dir("not-a-backup").join("backup.zip");
        fs::write(&path, b"not a zip at all").unwrap();

        assert!(inspect(&path).is_err());
    }

    #[test]
    fn rejects_newer_format_versions() {
        let path = temp_dir("future").join("backup.zip");
        export(&path, &[account("a1", initial_icon())], None).unwrap();

        // Rewrite the manifest with a version this build does not know.
        let bytes = fs::read(&path).unwrap();
        let mut archive = ZipArchive::new(Cursor::new(bytes)).unwrap();
        let mut accounts = Vec::new();
        archive
            .by_name(ACCOUNTS_FILE)
            .unwrap()
            .read_to_end(&mut accounts)
            .unwrap();
        let manifest: BackupManifest =
            serde_json::from_slice(&read_entry(&mut archive, MANIFEST_FILE, None).unwrap()).unwrap();

        let future = BackupManifest {
            format_version: FORMAT_VERSION + 1,
            ..manifest
        };
        let mut buffer = Vec::new();
        {
            let mut writer = ZipWriter::new(Cursor::new(&mut buffer));
            let options = SimpleFileOptions::default();
            writer.start_file(MANIFEST_FILE, options).unwrap();
            writer.write_all(&serde_json::to_vec(&future).unwrap()).unwrap();
            writer.start_file(ACCOUNTS_FILE, options).unwrap();
            writer.write_all(&accounts).unwrap();
            writer.finish().unwrap();
        }
        fs::write(&path, &buffer).unwrap();

        let error = inspect(&path).unwrap_err();
        assert!(error.contains("newer than this app supports"), "unexpected error: {error}");
    }

    #[test]
    fn converts_timestamps_to_zip_dates() {
        // 2026-09-15 15:09:00 UTC
        let stamp = zip_datetime(1_789_489_740);
        assert_eq!(stamp.year(), 2026);
        assert_eq!(stamp.month(), 9);
        assert_eq!(stamp.day(), 15);

        // Anything before the zip epoch clamps instead of panicking.
        assert_eq!(zip_datetime(0).year(), 1980);
    }

    #[test]
    fn sanitizes_unsafe_icon_file_names() {
        let path = temp_dir("unsafe-id").join("backup.zip");
        export(&path, &[account("../../etc/passwd", image_icon())], None).unwrap();

        let file = fs::File::open(&path).unwrap();
        let mut archive = ZipArchive::new(file).unwrap();
        let names: Vec<String> = (0..archive.len())
            .map(|i| archive.by_index(i).unwrap().name().to_string())
            .collect();

        assert!(names.iter().any(|n| n == "icons/______etc_passwd.png"), "{names:?}");

        let result = import(&path, None).unwrap();
        assert_eq!(result.accounts[0].icon.value, PNG_DATA_URL);
    }
}