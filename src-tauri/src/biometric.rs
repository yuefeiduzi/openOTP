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
        use localauthentication::LAContext;
        if let Ok(context) = LAContext::new() {
            context
                .can_evaluate_policy(localauthentication::LAPolicy::DeviceOwnerAuthenticationWithBiometrics)
                .unwrap_or(false)
        } else {
            false
        }
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
        use localauthentication::LAContext;
        if let Ok(context) = LAContext::new() {
            if let Ok(biometry_type) = context.biometry_type() {
                return match biometry_type {
                    localauthentication::BiometryType::FaceId => "faceid",
                    localauthentication::BiometryType::TouchId => "touchid",
                    _ => "none",
                }
                .to_string();
            }
        }
        "none".to_string()
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
        authenticate_macos(reason).inspect(|success| {
            if *success {
                status.reset();
            } else {
                status.record_failure();
            }
        })
    }
    #[cfg(target_os = "android")]
    {
        Err(BiometricError::SystemError(
            "Android biometric not yet integrated".into(),
        ))
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
fn authenticate_macos(reason: &str) -> Result<bool, BiometricError> {
    use localauthentication::{LAContext, LAPolicy, LAError};

    let context = LAContext::new().map_err(|e| BiometricError::SystemError(e.message().to_string()))?;

    match context.evaluate_policy(LAPolicy::DeviceOwnerAuthenticationWithBiometrics, reason) {
        Ok(true) => Ok(true),
        Ok(false) => Err(BiometricError::Failed),
        Err(e) => match e {
            LAError::UserCancel(_) => Err(BiometricError::UserCancelled),
            LAError::BiometryNotAvailable(_) => Err(BiometricError::NotAvailable),
            LAError::BiometryNotEnrolled(_) => Err(BiometricError::NoPermission),
            LAError::BiometryLockout(_) => Err(BiometricError::LockedOut),
            _ => Err(BiometricError::SystemError(e.message().to_string())),
        },
    }
}

pub fn is_biometric_available_public() -> bool {
    is_biometric_available()
}

pub fn authenticate_biometric(app: &AppHandle, reason: &str) -> Result<bool, BiometricError> {
    authenticate(app, reason)
}
