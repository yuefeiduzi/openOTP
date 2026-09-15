use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use sha2::Sha256;
use subtle::ConstantTimeEq;

const PBKDF2_ITERATIONS: u32 = 100_000;
const SALT_LENGTH: usize = 32;
const HASH_ALGORITHM: &str = "pbkdf2_sha256";

/// Derives a 32-byte key from a password and salt using PBKDF2-HMAC-SHA256.
pub fn derive_key(password: &str, salt: &[u8], iterations: u32) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, iterations, &mut key);
    key
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
