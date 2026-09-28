mod backup;
mod biometric;
mod biometric_status;
mod crypto;
mod storage;

use serde::Serialize;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition};

/// Size of the menu bar / tray popover window.
#[cfg(desktop)]
const POPOVER_WIDTH: f64 = 320.0;
#[cfg(desktop)]
const POPOVER_HEIGHT: f64 = 480.0;
/// Size of the tray's secondary-click menu window.
#[cfg(desktop)]
const TRAY_MENU_WIDTH: f64 = 200.0;
#[cfg(desktop)]
const TRAY_MENU_HEIGHT: f64 = 96.0;
/// Gap between the tray icon and the popover.
#[cfg(desktop)]
const POPOVER_GAP: f64 = 12.0;

use tauri::tray::TrayIconBuilder;
/// Whether the window is being used as a tray-only app.
///
/// macOS also drops the Dock icon; other desktops just keep the window hidden.
use tauri::LogicalPosition;
use tauri::WebviewWindowBuilder;

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
    SetupStatus {
        is_setup,
        has_password,
    }
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
fn is_desktop() -> bool {
    cfg!(desktop)
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
    apply_background_mode(&app, enabled);
    Ok(())
}

/// Applies or leaves background mode. On macOS this also switches between the
/// regular and accessory activation policies, which is what removes the Dock
/// icon; other desktops have no equivalent and only hide the window.
#[allow(unused_variables)]
fn apply_background_mode(app: &AppHandle, enabled: bool) {
    #[cfg(target_os = "macos")]
    {
        let policy = if enabled {
            tauri::ActivationPolicy::Accessory
        } else {
            tauri::ActivationPolicy::Regular
        };
        if let Err(e) = app.set_activation_policy(policy) {
            log::error!("failed to set activation policy: {}", e);
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, enabled);
    }
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

/// Quits the app. macOS has no tray menu (see the tray setup), so the popover
/// needs its own way out of menu-bar mode.
#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

/// Opens the main window on the settings page (the tray menu's 偏好设置).
#[tauri::command]
fn open_preferences(app: AppHandle) -> Result<(), String> {
    if let Some(menu) = app.get_webview_window("tray-menu") {
        let _ = menu.hide();
    }
    if let Some(main) = app.get_webview_window("main") {
        main.show().map_err(|e| e.to_string())?;
        main.set_focus().map_err(|e| e.to_string())?;
    }
    // The windows are separate webviews, so the route has to be switched by the
    // main window itself.
    app.emit_to("main", "navigate", "/settings")
        .map_err(|e| e.to_string())
}

/// Focuses a tray panel so it can take keyboard input.
///
/// An accessory app with no visible windows is hidden by AppKit, and a hidden
/// app's windows cannot become key, so the app has to be unhidden first. Unhiding
/// also brings the main window back, which is why it is put away again right
/// after: leaving it visible was what made repeated tray clicks look like they
/// switched between app mode and tray mode.
#[cfg(desktop)]
fn focus_tray_panel(app: &AppHandle, panel: &tauri::WebviewWindow) {
    let _ = app.show();
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.hide();
    }
    let _ = panel.set_focus();
}

/// Builds one of the tray-anchored panels (popover / secondary-click menu).
#[cfg(desktop)]
fn build_panel(
    app: &AppHandle,
    label: &str,
    route: &str,
    width: f64,
    height: f64,
    position: LogicalPosition<f64>,
) -> Option<tauri::WebviewWindow> {
    let window = WebviewWindowBuilder::new(app, label, tauri::WebviewUrl::App("index.html".into()))
        .title("OpenOTP")
        .inner_size(width, height)
        .position(position.x, position.y)
        .decorations(false)
        .resizable(false)
        .always_on_top(true)
        .transparent(true)
        .shadow(false)
        .visible(true)
        .build()
        .ok()?;

    let _ = window.eval(format!("window.location.hash = '{route}'"));
    Some(window)
}

/// Places the popover next to the tray icon, above it when the icon sits in
/// the lower half of the screen (the Windows tray) and below it otherwise (the
/// macOS menu bar), clamped so the window always lands inside that monitor.
#[cfg(desktop)]
fn popover_position(app: &AppHandle, clicked_at: PhysicalPosition<f64>) -> LogicalPosition<f64> {
    panel_position(app, clicked_at, POPOVER_WIDTH, POPOVER_HEIGHT)
}

/// Places any tray-anchored panel: the same clamping as the popover, for a panel
/// of the given size (the secondary-click menu is much smaller).
#[cfg(desktop)]
fn panel_position(
    app: &AppHandle,
    clicked_at: PhysicalPosition<f64>,
    width: f64,
    height: f64,
) -> LogicalPosition<f64> {
    // The tray reports physical pixels, while tao's `monitor_from_point` compares
    // against `CGDisplayBounds`, which is in points: on a 2x display the physical
    // point never matches a monitor and the lookup returns nothing (which used to
    // place the popover at twice the icon's coordinates, i.e. off-screen). Match
    // the monitors' physical rectangles here instead, then convert to logical
    // pixels, which is what places the window.
    let monitor = app
        .available_monitors()
        .ok()
        .and_then(|monitors| {
            monitors.into_iter().find(|monitor| {
                let position = monitor.position();
                let size = monitor.size();
                contains_physical(
                    Rect {
                        x: position.x as f64,
                        y: position.y as f64,
                        width: size.width as f64,
                        height: size.height as f64,
                    },
                    (clicked_at.x, clicked_at.y),
                )
            })
        })
        .or_else(|| app.primary_monitor().ok().flatten());

    let scale = monitor.as_ref().map(|m| m.scale_factor()).unwrap_or(1.0);
    let cursor = clicked_at.to_logical::<f64>(scale);

    let (x, y) = match monitor {
        Some(monitor) => {
            let scale = monitor.scale_factor();
            let origin = monitor.position().to_logical::<f64>(scale);
            let size = monitor.size().to_logical::<f64>(scale);
            place_panel(
                width,
                height,
                (cursor.x, cursor.y),
                Rect {
                    x: origin.x,
                    y: origin.y,
                    width: size.width,
                    height: size.height,
                },
            )
        }
        None => (cursor.x - width / 2.0, cursor.y + POPOVER_GAP),
    };

    LogicalPosition::new(x, y)
}

/// Whether a physical point lies inside a monitor's physical rectangle. Split out
/// so the edge rules stay testable without a monitor handle.
#[cfg(desktop)]
fn contains_physical(rect: Rect, point: (f64, f64)) -> bool {
    let (px, py) = point;

    px >= rect.x && px < rect.x + rect.width && py >= rect.y && py < rect.y + rect.height
}

/// A rectangle in whichever pixel space the caller works in: monitor areas and
/// pointer positions are both physical or both logical at every call site.
#[cfg(desktop)]
#[derive(Debug, Clone, Copy)]
struct Rect {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

/// Placement maths for the popover: [`place_panel`] at the popover's size.
#[cfg(all(test, desktop))]
fn place_popover(cursor: (f64, f64), monitor: Rect) -> (f64, f64) {
    place_panel(POPOVER_WIDTH, POPOVER_HEIGHT, cursor, monitor)
}

/// Placement maths shared by the tray-anchored panels, split out so it can be
/// tested without a window or monitor handle.
#[cfg(desktop)]
fn place_panel(width: f64, height: f64, cursor: (f64, f64), monitor: Rect) -> (f64, f64) {
    let (cursor_x, cursor_y) = cursor;
    let x = cursor_x - width / 2.0;
    let mut y = cursor_y + POPOVER_GAP;

    // Tray icons live at the bottom on Windows and at the top on macOS, so the
    // panel flips above the cursor when the cursor is in the lower half.
    if cursor_y > monitor.y + monitor.height / 2.0 {
        y = cursor_y - height - POPOVER_GAP;
    }

    let margin = 8.0;
    let min_x = monitor.x + margin;
    let min_y = monitor.y + margin;
    // max(...) keeps the range valid on monitors smaller than the panel.
    let max_x = (monitor.x + monitor.width - width - margin).max(min_x);
    let max_y = (monitor.y + monitor.height - height - margin).max(min_y);

    (x.clamp(min_x, max_x), y.clamp(min_y, max_y))
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

            #[cfg(desktop)]
            {
                let settings = storage::load_settings(app.handle());
                if settings.menu_bar_only {
                    // Hidden is enough on non-macOS, where there is no Dock icon.
                    apply_background_mode(app.handle(), true);
                    if let Some(main) = app.get_webview_window("main") {
                        let _ = main.hide();
                    }
                }

                // macOS uses a monochrome template image so the icon adapts to
                // the menu bar; other platforms show the regular app icon.
                #[cfg(target_os = "macos")]
                let tray_icon = tauri::image::Image::new(
                    include_bytes!("../icons/tray-template@2x.rgba"),
                    36,
                    36,
                );
                // Other desktops get the colour app icon. Kept as a checked-in
                // raw RGBA asset so the build does not need a PNG decoder.
                #[cfg(not(target_os = "macos"))]
                let tray_icon =
                    tauri::image::Image::new(include_bytes!("../icons/tray-32@2x.rgba"), 64, 64);

                // macOS attaches a menu to the status item and AppKit then opens it
                // on *any* click, so a left click never reaches the click handler and
                // `show_menu_on_left_click(false)` cannot override AppKit. To keep
                // click-to-open-popover, macOS gets no tray menu; those two actions
                // live in the popover UI instead (返回 App 模式 / 退出).
                // Windows and Linux show the menu on right click, so they keep it.
                #[cfg(not(target_os = "macos"))]
                let tray_menu = {
                    let en = settings.language == "en-US";
                    let return_item = tauri::menu::MenuItem::with_id(
                        app,
                        "tray_return_app",
                        if en {
                            "Back to App Mode"
                        } else {
                            "返回 App 模式"
                        },
                        true,
                        None::<&str>,
                    )?;
                    let quit_item = tauri::menu::PredefinedMenuItem::quit(
                        app,
                        Some(if en { "Quit" } else { "退出" }),
                    )?;
                    tauri::menu::Menu::with_items(app, &[&return_item, &quit_item])?
                };

                #[allow(unused_mut)]
                let mut tray_builder = TrayIconBuilder::with_id("main-tray")
                    .tooltip("OpenOTP")
                    .icon(tray_icon);

                #[cfg(not(target_os = "macos"))]
                {
                    tray_builder = tray_builder.menu(&tray_menu).show_menu_on_left_click(false);
                }

                // Monochrome template icons are a macOS menu bar convention.
                #[cfg(target_os = "macos")]
                {
                    tray_builder = tray_builder.icon_as_template(true);
                }

                let _tray = tray_builder
                    // Only reachable where a tray menu exists (Windows/Linux).
                    .on_menu_event(|tray, event| {
                        if event.id().0 == "tray_return_app" {
                            let app = tray.app_handle();
                            let mut settings = storage::load_settings(app);
                            settings.menu_bar_only = false;
                            if let Err(e) = storage::save_settings(app, &settings) {
                                log::error!("failed to persist background mode: {}", e);
                            }
                            apply_background_mode(app, false);
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
                        let tauri::tray::TrayIconEvent::Click {
                            button,
                            button_state: tauri::tray::MouseButtonState::Up,
                            position,
                            ..
                        } = event
                        else {
                            return;
                        };

                        let app = tray.app_handle();

                        match button {
                            tauri::tray::MouseButton::Left => {
                                // The secondary-click menu is a separate panel; one
                                // panel at a time.
                                if let Some(menu) = app.get_webview_window("tray-menu") {
                                    let _ = menu.hide();
                                }

                                // The popover *is* menu bar mode: put the main window
                                // away before anything else. Doing this only while
                                // creating the popover left the main window open behind it
                                // on every later click, which looked like clicking the tray
                                // switched between app mode and tray mode.
                                if let Some(main) = app.get_webview_window("main") {
                                    if main.is_visible().unwrap_or(false) {
                                        let _ = main.hide();
                                    }
                                }

                                if let Some(popover) = app.get_webview_window("popover") {
                                    if popover.is_visible().unwrap_or(false) {
                                        let _ = popover.hide();
                                        return;
                                    }

                                    // NOTE: runtime set_position on this window is unreliable
                                    // on macOS 26 (the window ends up offset); the position
                                    // set at creation time sticks, so only show/hide here.
                                    app.state::<PopoverState>()
                                        .pinned
                                        .store(false, Ordering::Relaxed);
                                    let _ = popover.show();
                                    focus_tray_panel(app, &popover);
                                    return;
                                }

                                let position = popover_position(app, position);
                                if let Some(popover) = build_panel(
                                    app,
                                    "popover",
                                    "#/popover",
                                    POPOVER_WIDTH,
                                    POPOVER_HEIGHT,
                                    position,
                                ) {
                                    app.state::<PopoverState>()
                                        .pinned
                                        .store(false, Ordering::Relaxed);
                                    let _ = popover.show();
                                    focus_tray_panel(app, &popover);
                                }
                            }
                            tauri::tray::MouseButton::Right => {
                                // A menu attached to the status item would be opened by
                                // AppKit on *any* click and swallow the left click, so the
                                // secondary click gets its own small panel window instead.
                                if let Some(popover) = app.get_webview_window("popover") {
                                    if popover.is_visible().unwrap_or(false) {
                                        let _ = popover.hide();
                                    }
                                }

                                if let Some(menu) = app.get_webview_window("tray-menu") {
                                    if menu.is_visible().unwrap_or(false) {
                                        let _ = menu.hide();
                                        return;
                                    }

                                    let _ = menu.show();
                                    let _ = menu.set_focus();
                                    return;
                                }

                                let position = panel_position(
                                    app,
                                    position,
                                    TRAY_MENU_WIDTH,
                                    TRAY_MENU_HEIGHT,
                                );
                                if let Some(menu) = build_panel(
                                    app,
                                    "tray-menu",
                                    "#/tray-menu",
                                    TRAY_MENU_WIDTH,
                                    TRAY_MENU_HEIGHT,
                                    position,
                                ) {
                                    let _ = menu.show();
                                    let _ = menu.set_focus();
                                }
                            }
                            _ => {}
                        }
                    })
                    .show_menu_on_left_click(false)
                    .build(app)?;
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the main window keeps the app alive in the tray on every
            // desktop platform; quitting is done from the tray menu.
            #[cfg(desktop)]
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

            // The tray's secondary-click menu is a normal popup: clicking anywhere
            // else dismisses it.
            if window.label() == "tray-menu" {
                if let tauri::WindowEvent::Focused(false) = event {
                    let w = window.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(150));
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
            is_desktop,
            set_popover_pinned,
            show_main_window,
            hide_main_window,
            set_menu_bar_only,
            quit_app,
            open_preferences,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(all(test, desktop))]
mod popover_tests {
    use super::*;

    /// 1512x982 macOS display, cursor on the menu bar icon at the top.
    #[test]
    fn places_below_the_cursor_on_macos() {
        let (x, y) = place_popover(
            (800.0, 10.0),
            Rect {
                x: 0.0,
                y: 0.0,
                width: 1512.0,
                height: 982.0,
            },
        );

        assert_eq!(y, 10.0 + POPOVER_GAP);
        assert_eq!(x, 800.0 - POPOVER_WIDTH / 2.0);
    }

    /// 1920x1080 Windows display, cursor on the tray icon at the bottom right.
    #[test]
    fn places_above_the_cursor_on_windows() {
        let (x, y) = place_popover(
            (1900.0, 1050.0),
            Rect {
                x: 0.0,
                y: 0.0,
                width: 1920.0,
                height: 1080.0,
            },
        );

        assert_eq!(y, 1050.0 - POPOVER_HEIGHT - POPOVER_GAP);
        // Clamped by the right edge instead of hanging off the screen.
        assert_eq!(x, 1920.0 - POPOVER_WIDTH - 8.0);
    }

    #[test]
    fn clamps_to_the_left_and_top_edges() {
        let (x, y) = place_popover(
            (4.0, 8.0),
            Rect {
                x: 0.0,
                y: 0.0,
                width: 1512.0,
                height: 982.0,
            },
        );

        assert_eq!(x, 8.0);
        assert_eq!(y, 8.0 + POPOVER_GAP);
    }

    /// Cursor in the lower half flips the panel above, even when below would
    /// still fit inside the clamp range.
    #[test]
    fn flips_above_a_tray_icon_in_the_lower_half() {
        let (_, y) = place_popover(
            (800.0, 600.0),
            Rect {
                x: 0.0,
                y: 0.0,
                width: 1512.0,
                height: 700.0,
            },
        );

        assert_eq!(y, 600.0 - POPOVER_HEIGHT - POPOVER_GAP);
    }

    /// Cursor in the upper half places below, but the bottom edge still wins.
    #[test]
    fn clamps_the_bottom_edge_when_placing_below() {
        let (_, y) = place_popover(
            (800.0, 440.0),
            Rect {
                x: 0.0,
                y: 0.0,
                width: 1512.0,
                height: 900.0,
            },
        );

        assert_eq!(y, 900.0 - POPOVER_HEIGHT - 8.0);
    }

    #[test]
    fn stays_inside_a_monitor_smaller_than_the_popover() {
        let (x, y) = place_popover(
            (150.0, 200.0),
            Rect {
                x: 0.0,
                y: 0.0,
                width: 300.0,
                height: 400.0,
            },
        );

        assert_eq!((x, y), (8.0, 8.0));
    }

    #[test]
    fn accounts_for_a_second_monitor_offset() {
        // Monitor to the right of the primary one, cursor on its tray icon.
        let (x, y) = place_popover(
            (2100.0, 1050.0),
            Rect {
                x: 1920.0,
                y: 0.0,
                width: 1920.0,
                height: 1080.0,
            },
        );

        assert_eq!(y, 1050.0 - POPOVER_HEIGHT - POPOVER_GAP);
        // Centred under the cursor, still on that monitor.
        assert_eq!(x, 2100.0 - POPOVER_WIDTH / 2.0);

        // Cursor near the right edge of the second monitor clamps to it.
        let (x, _) = place_popover(
            (3800.0, 1050.0),
            Rect {
                x: 1920.0,
                y: 0.0,
                width: 1920.0,
                height: 1080.0,
            },
        );
        assert_eq!(x, 1920.0 + 1920.0 - POPOVER_WIDTH - 8.0);
    }

    /// Click points are physical: on the 2x main display (3024x1964 physical,
    /// 1512x982 logical) a click on the menu bar icon at logical (1080, 16) arrives
    /// as (2160, 32) and must still resolve to the main display.
    #[test]
    fn matches_the_monitor_by_its_physical_rect() {
        let main = Rect {
            x: 0.0,
            y: 0.0,
            width: 3024.0,
            height: 1964.0,
        };
        let external = Rect {
            x: -1920.0,
            y: -98.0,
            width: 1920.0,
            height: 1080.0,
        };

        assert!(contains_physical(main, (2160.0, 32.0)));
        assert!(!contains_physical(main, (3600.0, 32.0)));
        assert!(contains_physical(external, (-386.0, -84.0)));
        // A monitor owns its top-left edge; the right/bottom edges belong to the next.
        assert!(!contains_physical(main, (3024.0, 10.0)));
        assert!(contains_physical(main, (0.0, 0.0)));
        assert!(contains_physical(external, (-1920.0, -98.0)));
        // The external display ends where the main one starts.
        assert!(!contains_physical(external, (0.0, -98.0)));
    }
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

        let result =
            import_backup(path, Some("password123".into())).expect("import should succeed");
        assert_eq!(result.accounts.len(), 1);
        assert_eq!(result.accounts[0].secret, "JBSWY3DPEHPK3PXP");
        assert_eq!(
            result.accounts[0].icon.value,
            "data:image/png;base64,iVBORw0KGgo="
        );
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
        assert!(
            error.contains("wrong password"),
            "unexpected error: {error}"
        );
    }
}
