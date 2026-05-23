mod storage;
mod crypto;
mod biometric;
mod biometric_status;

use tauri::AppHandle;

#[tauri::command]
fn get_accounts(app: AppHandle) -> Vec<storage::Account> {
    storage::load_accounts(&app)
}

#[tauri::command]
fn save_account(app: AppHandle, account: storage::Account) -> Result<(), String> {
    let mut accounts = storage::load_accounts(&app);
    if let Some(pos) = accounts.iter().position(|a| a.id == account.id) {
        accounts[pos] = account;
    } else {
        accounts.push(account);
    }
    storage::save_accounts(&app, &accounts)
}

#[tauri::command]
fn delete_account(app: AppHandle, id: String) -> Result<(), String> {
    let accounts: Vec<storage::Account> = storage::load_accounts(&app)
        .into_iter()
        .filter(|a| a.id != id)
        .collect();
    storage::save_accounts(&app, &accounts)
}

#[tauri::command]
fn get_settings(app: AppHandle) -> storage::AppSettings {
    storage::load_settings(&app)
}

#[tauri::command]
fn save_settings(app: AppHandle, settings: storage::AppSettings) -> Result<(), String> {
    storage::save_settings(&app, &settings)
}

#[tauri::command]
fn encrypt_data(plaintext: String, password: String) -> Result<crypto::EncryptedData, String> {
    crypto::encrypt(&plaintext, &password)
}

#[tauri::command]
fn decrypt_data(encrypted: crypto::EncryptedData, password: String) -> Result<String, String> {
    crypto::decrypt(&encrypted, &password)
}

#[tauri::command]
fn hash_password_cmd(password: String) -> String {
    crypto::hash_password(&password)
}

#[tauri::command]
fn verify_password_cmd(password: String, hash: String) -> bool {
    crypto::verify_password(&password, &hash)
}

#[tauri::command]
fn check_biometric() -> bool {
    biometric::is_biometric_available_public()
}

#[tauri::command]
fn get_biometric_type() -> String {
    biometric::get_biometric_type()
}

#[tauri::command]
fn biometric_auth(app: AppHandle, reason: String) -> Result<bool, biometric::BiometricError> {
    biometric::authenticate_biometric(&app, &reason)
}

#[tauri::command]
fn get_biometric_status(app: AppHandle) -> biometric::BiometricStatusResponse {
    biometric::get_status(&app)
}

#[tauri::command]
fn reset_biometric_failures(app: AppHandle) {
    biometric::reset_failures(&app)
}

#[tauri::command]
fn has_setup(app: AppHandle) -> bool {
    storage::has_setup(&app)
}

#[tauri::command]
fn save_password_hash(app: AppHandle, hash: String) -> Result<(), String> {
    storage::save_password_hash(&app, &hash)
}

#[tauri::command]
fn load_password_hash(app: AppHandle) -> Option<String> {
    storage::load_password_hash(&app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_accounts,
            save_account,
            delete_account,
            get_settings,
            save_settings,
            encrypt_data,
            decrypt_data,
            hash_password_cmd,
            verify_password_cmd,
            check_biometric,
            get_biometric_type,
            biometric_auth,
            get_biometric_status,
            reset_biometric_failures,
            has_setup,
            save_password_hash,
            load_password_hash,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
