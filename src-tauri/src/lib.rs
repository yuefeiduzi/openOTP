mod storage;
mod crypto;
mod biometric;
mod biometric_status;

use serde::Serialize;
use tauri::AppHandle;
use tauri::LogicalPosition;
use tauri::Manager;
use tauri::WebviewWindowBuilder;
use tauri::tray::TrayIconBuilder;

#[derive(Serialize)]
struct SetupStatus {
    is_setup: bool,
    has_password: bool,
}

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
fn has_setup(app: AppHandle) -> SetupStatus {
    let is_setup = storage::has_setup(&app);
    let has_password = storage::has_password_hash(&app);
    SetupStatus { is_setup, has_password }
}

#[tauri::command]
fn save_password_hash(app: AppHandle, hash: String) -> Result<(), String> {
    storage::save_password_hash(&app, &hash)
}

#[tauri::command]
fn load_password_hash(app: AppHandle) -> Option<String> {
    storage::load_password_hash(&app)
}

#[tauri::command]
fn is_macos() -> bool {
    cfg!(target_os = "macos")
}

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(popover) = app.get_webview_window("popover") {
        popover.hide().map_err(|e| e.to_string())?;
    }
    if let Some(main) = app.get_webview_window("main") {
        main.show().map_err(|e| e.to_string())?;
        main.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn hide_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(main) = app.get_webview_window("main") {
        main.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
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

            #[cfg(target_os = "macos")]
            {
                let tray_icon = tauri::image::Image::new(
                    include_bytes!("../icons/tray-template.rgba"),
                    22,
                    22,
                );
                let _tray = TrayIconBuilder::with_id("main-tray")
                    .tooltip("OpenOTP")
                    .icon(tray_icon)
                    .icon_as_template(true)
                    .on_tray_icon_event(|tray, event| {
                        if let tauri::tray::TrayIconEvent::Click {
                            button: tauri::tray::MouseButton::Left,
                            rect,
                            ..
                        } = event {
                            let app = tray.app_handle();

                            if let Some(popover) = app.get_webview_window("popover") {
                                if popover.is_visible().unwrap_or(false) {
                                    let _ = popover.hide();
                                    return;
                                }
                            }

                            if let Some(main) = app.get_webview_window("main") {
                                if main.is_visible().unwrap_or(false) {
                                    let _ = main.hide();
                                }
                            }

                            if let Some(popover) = app.get_webview_window("popover") {
                                let pos = rect.position.to_logical::<f64>(1.0);
                                let sz = rect.size.to_logical::<f64>(1.0);
                                let x = pos.x + (sz.width / 2.0) - 160.0;
                                let y = pos.y + sz.height + 4.0;
                                let _ = popover.set_position(LogicalPosition::new(x, y));
                                let _ = popover.show();
                                let _ = popover.set_focus();
                                return;
                            }

                            if let Ok(popover) = WebviewWindowBuilder::new(app, "popover", tauri::WebviewUrl::App("index.html".into()))
                                .title("OpenOTP")
                                .inner_size(320.0, 480.0)
                                .decorations(false)
                                .resizable(false)
                                .always_on_top(true)
                                .visible(false)
                                .build()
                            {
                                let _ = popover.eval("window.location.hash = '#/popover'");
                                let pos = rect.position.to_logical::<f64>(1.0);
                                let sz = rect.size.to_logical::<f64>(1.0);
                                let x = pos.x + (sz.width / 2.0) - 160.0;
                                let y = pos.y + sz.height + 4.0;
                                let _ = popover.set_position(LogicalPosition::new(x, y));
                                let _ = popover.show();
                                let _ = popover.set_focus();
                            }
                        }
                    })
                    .show_menu_on_left_click(false)
                    .build(app)?;
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            #[cfg(target_os = "macos")]
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    window.hide().ok();
                    api.prevent_close();
                }
            }

            if window.label() == "popover" {
                if let tauri::WindowEvent::Focused(false) = event {
                    window.hide().ok();
                }
            }
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
            is_macos,
            show_main_window,
            hide_main_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
