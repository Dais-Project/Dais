use rand::RngCore;

pub fn generate_desktop_auth_token() -> String {
  let mut bytes = [0_u8; 32];
  rand::rng().fill_bytes(&mut bytes);
  bytes.iter().map(|byte| format!("{:02x}", byte)).collect()
}
