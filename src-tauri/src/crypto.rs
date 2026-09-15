use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::Engine;
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use subtle::ConstantTimeEq;

const PBKDF2_ITERATIONS: u32 = 100_000;
const SALT_LENGTH: usize = 32;
const NONCE_LENGTH: usize = 12;
const HASH_ALGORITHM: &str = "pbkdf2_sha256";

fn default_iterations() -> u32 {
    PBKDF2_ITERATIONS
}

#[derive(Serialize, Deserialize)]
pub struct EncryptedData {
    /// KDF work factor used for this payload. Defaults to the legacy value so
    /// payloads written before the field existed still decrypt.
    #[serde(default = "default_iterations")]
    pub iterations: u32,
    pub nonce: String,
    pub salt: String,
    pub ciphertext: String,
}

/// Derives a 32-byte AES key from a password and salt using PBKDF2-HMAC-SHA256.
pub fn derive_key(password: &str, salt: &[u8], iterations: u32) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, iterations, &mut key);
    key
}

/// Encrypts plaintext with AES-256-GCM using a key derived from the password.
/// Returns base64-encoded nonce, salt, and ciphertext.
pub fn encrypt(plaintext: &str, password: &str) -> Result<EncryptedData, String> {
    let mut salt = [0u8; SALT_LENGTH];
    rand::rngs::OsRng.fill_bytes(&mut salt);

    let key = derive_key(password, &salt, PBKDF2_ITERATIONS);
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| format!("invalid key length: {}", e))?;

    let mut nonce_bytes = [0u8; NONCE_LENGTH];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("encryption failed: {}", e))?;

    Ok(EncryptedData {
        iterations: PBKDF2_ITERATIONS,
        nonce: base64::engine::general_purpose::STANDARD.encode(nonce_bytes),
        salt: base64::engine::general_purpose::STANDARD.encode(salt),
        ciphertext: base64::engine::general_purpose::STANDARD.encode(&ciphertext),
    })
}

/// Decrypts AES-256-GCM encrypted data. Returns the plaintext string.
/// Returns an error if the password is wrong or the data is corrupted.
pub fn decrypt(encrypted: &EncryptedData, password: &str) -> Result<String, String> {
    let nonce_bytes = base64::engine::general_purpose::STANDARD
        .decode(&encrypted.nonce)
        .map_err(|e| format!("failed to decode nonce: {}", e))?;
    let salt = base64::engine::general_purpose::STANDARD
        .decode(&encrypted.salt)
        .map_err(|e| format!("failed to decode salt: {}", e))?;
    let ciphertext = base64::engine::general_purpose::STANDARD
        .decode(&encrypted.ciphertext)
        .map_err(|e| format!("failed to decode ciphertext: {}", e))?;

    let key = derive_key(password, &salt, encrypted.iterations);
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| format!("invalid key length: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| "decryption failed: wrong password or corrupted data".to_string())?;

    String::from_utf8(plaintext).map_err(|e| format!("invalid utf-8 in decrypted data: {}", e))
}

/// Hashes a password with a random salt using PBKDF2-HMAC-SHA256.
/// Returns "pbkdf2_sha256:<iterations>:<salt_hex>:<hash_hex>".
pub fn hash_password(password: &str) -> String {
    let mut salt = [0u8; SALT_LENGTH];
    rand::rngs::OsRng.fill_bytes(&mut salt);
    let key = derive_key(password, &salt, PBKDF2_ITERATIONS);
    format!(
        "{}:{}:{}:{}",
        HASH_ALGORITHM,
        PBKDF2_ITERATIONS,
        hex::encode(salt),
        hex::encode(key)
    )
}

/// Verifies a password against a stored hash.
///
/// Accepts both the current "algorithm:iterations:salt:hash" format and the
/// legacy "salt:hash" format written before the parameters were recorded.
pub fn verify_password(password: &str, hash: &str) -> bool {
    let (iterations, salt_hex, expected_hex) = match parse_password_hash(hash) {
        Some(parts) => parts,
        None => return false,
    };

    let salt = match hex::decode(salt_hex) {
        Ok(s) => s,
        Err(_) => return false,
    };
    let expected_key = match hex::decode(expected_hex) {
        Ok(k) => k,
        Err(_) => return false,
    };

    let key = derive_key(password, &salt, iterations);

    // Constant-time comparison: a timing side channel here would leak how many
    // leading bytes of the derived key matched.
    key.ct_eq(expected_key.as_slice()).into()
}

fn parse_password_hash(hash: &str) -> Option<(u32, &str, &str)> {
    let parts: Vec<&str> = hash.split(':').collect();

    match parts.as_slice() {
        [algorithm, iterations, salt, expected] if *algorithm == HASH_ALGORITHM => {
            let iterations = iterations.parse::<u32>().ok()?;
            if iterations == 0 {
                return None;
            }
            Some((iterations, salt, expected))
        }
        // Legacy "salt:hash" written before the work factor was recorded.
        [salt, expected] => Some((PBKDF2_ITERATIONS, salt, expected)),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encrypts_and_decrypts_round_trip() {
        let encrypted = encrypt("top secret", "123456").unwrap();
        assert_eq!(decrypt(&encrypted, "123456").unwrap(), "top secret");
    }

    #[test]
    fn writes_the_kdf_work_factor() {
        let encrypted = encrypt("payload", "123456").unwrap();
        assert_eq!(encrypted.iterations, PBKDF2_ITERATIONS);
    }

    #[test]
    fn rejects_the_wrong_password() {
        let encrypted = encrypt("top secret", "123456").unwrap();
        assert!(decrypt(&encrypted, "654321").is_err());
    }

    #[test]
    fn decrypts_legacy_payloads_without_iterations() {
        let encrypted = encrypt("legacy", "123456").unwrap();
        let legacy = serde_json::json!({
            "nonce": encrypted.nonce,
            "salt": encrypted.salt,
            "ciphertext": encrypted.ciphertext,
        });

        let parsed: EncryptedData = serde_json::from_value(legacy).unwrap();

        assert_eq!(parsed.iterations, PBKDF2_ITERATIONS);
        assert_eq!(decrypt(&parsed, "123456").unwrap(), "legacy");
    }

    #[test]
    fn hashes_and_verifies_a_password() {
        let hash = hash_password("123456");
        assert!(hash.starts_with("pbkdf2_sha256:"));
        assert!(verify_password("123456", &hash));
        assert!(!verify_password("654321", &hash));
    }

    #[test]
    fn verifies_legacy_salt_hash_passwords() {
        let mut salt = [0u8; SALT_LENGTH];
        rand::rngs::OsRng.fill_bytes(&mut salt);
        let key = derive_key("123456", &salt, PBKDF2_ITERATIONS);
        let legacy = format!("{}:{}", hex::encode(salt), hex::encode(key));

        assert!(verify_password("123456", &legacy));
        assert!(!verify_password("654321", &legacy));
    }

    #[test]
    fn rejects_malformed_hashes() {
        assert!(!verify_password("123456", ""));
        assert!(!verify_password("123456", "not-a-hash"));
        assert!(!verify_password("123456", "pbkdf2_sha256:100000:zz:zz"));
        assert!(!verify_password("123456", "pbkdf2_sha256:0:aabb:ccdd"));
        assert!(!verify_password("123456", "sha256:100000:aabb:ccdd"));
    }

    #[test]
    fn salts_each_hash_differently() {
        assert_ne!(hash_password("123456"), hash_password("123456"));
    }
}
