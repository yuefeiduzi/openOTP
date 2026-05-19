/// Checks whether biometric authentication is available on the current platform.
/// Currently returns true on macOS (Touch ID placeholder) and false elsewhere.
pub fn is_biometric_available() -> bool {
    #[cfg(target_os = "macos")]
    {
        true
    }
    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

/// Attempts biometric authentication. Currently returns Ok(true) on macOS as a placeholder.
/// Real implementation requires platform-specific APIs (Security.framework, Windows Hello, etc.).
pub fn authenticate_biometric(_reason: &str) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        Ok(true)
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(false)
    }
}
