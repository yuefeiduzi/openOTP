mod storage;
mod crypto;
mod backup;
mod biometric;
mod biometric_status;

use serde::Serialize;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
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
fn export_backup(
    path: String,
    accounts: Vec<storage::Account>,
    password: Option<String>,
) -> Result<backup::BackupManifest, String> {
    backup::export(Path::new(&path), &accounts, password.as_deref())
}

#[tauri::command]
fn inspect_backup(path: String) -> Result<backup::BackupManifest, String> {
    backup::inspect(Path::new(&path))
}

#[tauri::command]
fn import_backup(path: String, password: Option<String>) -> Result<backup::ImportResult, String> {
    backup::import(Path::new(&path), password.as_deref())
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

/// While pinned the popover ignores focus loss, so opening a native file dialog
/// from one of its modals no longer hides the window underneath the dialog.
#[derive(Default)]
struct PopoverState {
    pinned: AtomicBool,
}

#[tauri::command]
fn set_popover_pinned(state: tauri::State<PopoverState>, pinned: bool) {
    state.pinned.store(pinned, Ordering::Relaxed);
}

#[tauri::command]
fn set_menu_bar_only(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let policy = if enabled {
            tauri::ActivationPolicy::Accessory
        } else {
            tauri::ActivationPolicy::Regular
        };
        app.set_activation_policy(policy)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
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
        .manage(PopoverState::default())
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
                let settings = storage::load_settings(app.handle());
                if settings.menu_bar_only {
                    app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                    if let Some(main) = app.get_webview_window("main") {
                        let _ = main.hide();
                    }
                }

                // Use the 44x44 (@2x) template image: tray-icon forces an 18pt
                // status-bar height on macOS, so on Retina (2x) the rendered icon
                // needs 36px+ of source pixels — the 22px 1x asset gets upscaled
                // and looks blurry in the menu bar.
                let tray_icon = tauri::image::Image::new(
                    include_bytes!("../icons/tray-template@2x.rgba"),
                    44,
                    44,
                );
                let en = settings.language == "en-US";
                let return_item = tauri::menu::MenuItem::with_id(
                    app,
                    "tray_return_app",
                    if en { "Back to App Mode" } else { "返回 App 模式" },
                    true,
                    None::<&str>,
                )?;
                let quit_item =
                    tauri::menu::PredefinedMenuItem::quit(app, Some(if en { "Quit" } else { "退出" }))?;
                let tray_menu = tauri::menu::Menu::with_items(app, &[&return_item, &quit_item])?;

                let _tray = TrayIconBuilder::with_id("main-tray")
                    .tooltip("OpenOTP")
                    .icon(tray_icon)
                    .icon_as_template(true)
                    .menu(&tray_menu)
                    .on_menu_event(|tray, event| {
                        if event.id().0 == "tray_return_app" {
                            let app = tray.app_handle();
                            let mut settings = storage::load_settings(app);
                            settings.menu_bar_only = false;
                            if let Err(e) = storage::save_settings(app, &settings) {
                                log::error!("failed to persist menu bar mode: {}", e);
                            }
                            if let Err(e) = app.set_activation_policy(tauri::ActivationPolicy::Regular) {
                                log::error!("failed to restore activation policy: {}", e);
                            }
                            if let Some(popover) = app.get_webview_window("popover") {
                                let _ = popover.hide();
                            }
                            if let Some(main) = app.get_webview_window("main") {
                                let _ = main.show();
                                let _ = main.set_focus();
                            }
                        }
                    })
                    .on_tray_icon_event(|tray, event| {
                        // macOS fires a Click event for both mouseDown and mouseUp;
                        // only handle the Up event so one physical click toggles once.
                        if let tauri::tray::TrayIconEvent::Click {
                            button: tauri::tray::MouseButton::Left,
                            button_state: tauri::tray::MouseButtonState::Up,
                            position,
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

                            // The click position is in physical pixels (the cursor is on
                            // the tray icon); find the monitor under it for the scale factor.
                            let scale = app
                                .available_monitors()
                                .unwrap_or_default()
                                .into_iter()
                                .find(|m| {
                                    let p = m.position();
                                    let sz = m.size();
                                    position.x >= p.x as f64
                                        && position.x < p.x as f64 + sz.width as f64
                                        && position.y >= p.y as f64
                                        && position.y < p.y as f64 + sz.height as f64
                                })
                                .map(|m| m.scale_factor())
                                .unwrap_or(1.0);
                            let pos = position.to_logical::<f64>(scale);
                            // Center the popover under the cursor, slightly below it.
                            let x = pos.x - 160.0;
                            let y = pos.y + 12.0;
                            let target = LogicalPosition::new(x, y);

                            if let Some(popover) = app.get_webview_window("popover") {
                                // NOTE: runtime set_position on this window is unreliable on
                                // macOS 26 (the window ends up offset); the position set at
                                // creation time sticks, so only show/hide here.
                                app.state::<PopoverState>().pinned.store(false, Ordering::Relaxed);
                                let _ = popover.show();
                                let _ = app.show();
                                let _ = popover.set_focus();
                                return;
                            }

                            if let Ok(popover) = WebviewWindowBuilder::new(app, "popover", tauri::WebviewUrl::App("index.html".into()))
                                .title("OpenOTP")
                                .inner_size(320.0, 480.0)
                                .position(target.x, target.y)
                                .decorations(false)
                                .resizable(false)
                                .always_on_top(true)
                                .transparent(true)
                                .shadow(false)
                                .visible(true)
                                .build()
                            {
                                let _ = popover.eval("window.location.hash = '#/popover'");
                                app.state::<PopoverState>().pinned.store(false, Ordering::Relaxed);
                                let _ = popover.show();
                                let _ = app.show();
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
                    let w = window.clone();
                    let app = window.app_handle().clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(200));
                        if app.state::<PopoverState>().pinned.load(Ordering::Relaxed) {
                            return;
                        }
                        if w.is_visible().unwrap_or(false) && !w.is_focused().unwrap_or(false) {
                            let _ = w.hide();
                        }
                    });
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_accounts,
            save_account,
            delete_account,
            get_settings,
            save_settings,
            hash_password_cmd,
            verify_password_cmd,
            export_backup,
            inspect_backup,
            import_backup,
            check_biometric,
            get_biometric_type,
            biometric_auth,
            get_biometric_status,
            reset_biometric_failures,
            has_setup,
            save_password_hash,
            load_password_hash,
            is_macos,
            set_popover_pinned,
            show_main_window,
            hide_main_window,
            set_menu_bar_only,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod command_tests {
    use super::*;
    use crate::storage::{Account, AccountIcon};

    fn temp_path(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("openotp-cmd-{}-{}", name, std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir.join("backup.zip")
    }

    fn account() -> Account {
        Account {
            id: "a1".into(),
            name: "alice@example.com".into(),
            issuer: "GitHub".into(),
            icon: AccountIcon {
                icon_type: "image".into(),
                value: "data:image/png;base64,iVBORw0KGgo=".into(),
                bg_color: String::new(),
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
    fn export_inspect_and_import_round_trip() {
        let path = temp_path("round-trip").to_string_lossy().to_string();

        let manifest = export_backup(path.clone(), vec![account()], Some("password123".into()))
            .expect("export should succeed");
        assert!(manifest.encrypted);
        assert_eq!(manifest.account_count, 1);

        let inspected = inspect_backup(path.clone()).expect("inspect should succeed");
        assert!(inspected.encrypted);

        let result = import_backup(path, Some("password123".into())).expect("import should succeed");
        assert_eq!(result.accounts.len(), 1);
        assert_eq!(result.accounts[0].secret, "JBSWY3DPEHPK3PXP");
        assert_eq!(result.accounts[0].icon.value, "data:image/png;base64,iVBORw0KGgo=");
    }

    #[test]
    fn exports_and_imports_without_a_password() {
        let path = temp_path("plain").to_string_lossy().to_string();

        let manifest = export_backup(path.clone(), vec![account()], None).expect("export");
        assert!(!manifest.encrypted);

        let result = import_backup(path, None).expect("import");
        assert_eq!(result.accounts[0].secret, "JBSWY3DPEHPK3PXP");
    }

    #[test]
    fn reports_a_wrong_password_instead_of_silently_failing() {
        let path = temp_path("wrong-password").to_string_lossy().to_string();
        export_backup(path.clone(), vec![account()], Some("password123".into())).unwrap();

        let error = import_backup(path, Some("password124".into())).unwrap_err();
        assert!(error.contains("wrong password"), "unexpected error: {error}");
    }
}
