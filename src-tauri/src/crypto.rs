use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::Engine;
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::Sha256;

const PBKDF2_ITERATIONS: u32 = 100_000;
const SALT_LENGTH: usize = 32;
const NONCE_LENGTH: usize = 12;

#[derive(Serialize, Deserialize)]
pub struct EncryptedData {
    pub nonce: String,
    pub salt: String,
    pub ciphertext: String,
}

/// Derives a 32-byte AES key from a password and salt using PBKDF2-HMAC-SHA256.
pub fn derive_key(password: &str, salt: &[u8]) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, PBKDF2_ITERATIONS, &mut key);
    key
}

/// Encrypts plaintext with AES-256-GCM using a key derived from the password.
/// Returns base64-encoded nonce, salt, and ciphertext.
pub fn encrypt(plaintext: &str, password: &str) -> Result<EncryptedData, String> {
    let mut salt = [0u8; SALT_LENGTH];
    rand::rngs::OsRng.fill_bytes(&mut salt);

    let key = derive_key(password, &salt);
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| format!("invalid key length: {}", e))?;

    let mut nonce_bytes = [0u8; NONCE_LENGTH];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("encryption failed: {}", e))?;

    Ok(EncryptedData {
        nonce: base64::engine::general_purpose::STANDARD.encode(&nonce_bytes),
        salt: base64::engine::general_purpose::STANDARD.encode(&salt),
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

    let key = derive_key(password, &salt);
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| format!("invalid key length: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| "decryption failed: wrong password or corrupted data".to_string())?;

    String::from_utf8(plaintext).map_err(|e| format!("invalid utf-8 in decrypted data: {}", e))
}

/// Hashes a password with a random salt using PBKDF2-HMAC-SHA256.
/// Returns a "salt:hash" string with both parts hex-encoded.
pub fn hash_password(password: &str) -> String {
    let mut salt = [0u8; SALT_LENGTH];
    rand::rngs::OsRng.fill_bytes(&mut salt);
    let key = derive_key(password, &salt);
    format!("{}:{}", hex::encode(salt), hex::encode(key))
}

/// Verifies a password against a stored hash in "salt:hash" hex format.
pub fn verify_password(password: &str, hash: &str) -> bool {
    let parts: Vec<&str> = hash.splitn(2, ':').collect();
    if parts.len() != 2 {
        return false;
    }
    let salt = match hex::decode(parts[0]) {
        Ok(s) => s,
        Err(_) => return false,
    };
    let expected_key = match hex::decode(parts[1]) {
        Ok(k) => k,
        Err(_) => return false,
    };
    let key = derive_key(password, &salt);
    key == expected_key.as_slice()
}
