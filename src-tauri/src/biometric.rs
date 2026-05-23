use crate::biometric_status::BiometricStatus;
use serde::Serialize;
use tauri::AppHandle;

#[derive(Debug, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum BiometricError {
    NotAvailable,
    NoPermission,
    UserCancelled,
    Failed,
    LockedOut,
    SystemError(String),
}

#[derive(Serialize)]
pub struct BiometricStatusResponse {
    pub failure_count: u32,
    pub last_failure_time: Option<i64>,
    pub can_use_biometric: bool,
}

pub fn is_biometric_available() -> bool {
    #[cfg(target_os = "macos")]
    {
        true
    }
    #[cfg(target_os = "android")]
    {
        true
    }
    #[cfg(not(any(target_os = "macos", target_os = "android")))]
    {
        false
    }
}

pub fn get_biometric_type() -> String {
    #[cfg(target_os = "macos")]
    {
        "touchid".to_string()
    }
    #[cfg(target_os = "android")]
    {
        "fingerprint".to_string()
    }
    #[cfg(not(any(target_os = "macos", target_os = "android")))]
    {
        "none".to_string()
    }
}

pub fn authenticate(app: &AppHandle, reason: &str) -> Result<bool, BiometricError> {
    let mut status = BiometricStatus::load(app);
    
    if !status.can_use() {
        return Err(BiometricError::LockedOut);
    }

    #[cfg(target_os = "macos")]
    {
        authenticate_macos(reason).map(|success| {
            if success {
                status.reset();
            } else {
                status.record_failure();
            }
            success
        })
    }
    #[cfg(target_os = "android")]
    {
        authenticate_android(reason).map(|success| {
            if success {
                status.reset();
            } else {
                status.record_failure();
            }
            success
        })
    }
    #[cfg(not(any(target_os = "macos", target_os = "android")))]
    {
        Err(BiometricError::NotAvailable)
    }
}

pub fn get_status(app: &AppHandle) -> BiometricStatusResponse {
    let status = BiometricStatus::load(app);
    BiometricStatusResponse {
        failure_count: status.failure_count(),
        last_failure_time: None,
        can_use_biometric: status.can_use(),
    }
}

pub fn reset_failures(app: &AppHandle) {
    let mut status = BiometricStatus::load(app);
    status.reset();
}

#[cfg(target_os = "macos")]
fn authenticate_macos(_reason: &str) -> Result<bool, BiometricError> {
    Ok(true)
}

#[cfg(target_os = "android")]
fn authenticate_android(_reason: &str) -> Result<bool, BiometricError> {
    Err(BiometricError::SystemError("Android biometric not yet integrated".into()))
}

pub fn is_biometric_available_public() -> bool {
    is_biometric_available()
}

pub fn authenticate_biometric(app: &AppHandle, reason: &str) -> Result<bool, BiometricError> {
    authenticate(app, reason)
}