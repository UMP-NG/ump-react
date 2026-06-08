import crypto from "crypto";

const ALGO = "aes-256-cbc";

const _rawKey = process.env.FIELD_ENCRYPTION_KEY;
if (!_rawKey || _rawKey.length !== 64 || !/^[0-9a-f]{64}$/i.test(_rawKey)) {
  throw new Error(
    "FIELD_ENCRYPTION_KEY must be a 64-character hex string. " +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
}
const KEY = Buffer.from(_rawKey, "hex"); // 32 bytes

// Encrypted format: "<16-byte IV hex>:<ciphertext hex>"
// Plaintext values (all digits, no colon) are returned as-is for backwards compatibility.

export function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(value) {
  if (!value) return value;
  // If value has no colon it was stored before encryption was added — return as-is
  if (!value.includes(":")) return value;
  try {
    const parts   = value.split(":");
    const ivHex   = parts[0] ?? "";
    const dataHex = parts[1] ?? "";
    const iv       = Buffer.from(ivHex, "hex");
    const data     = Buffer.from(dataHex, "hex");
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    // Corrupted or wrong key — return raw so callers can surface an error rather than silently failing
    return value;
  }
}

export function mask(value) {
  if (!value) return value;
  const plain = decrypt(value);
  // If decrypt returned the raw ciphertext (failed), show a generic mask instead of
  // accidentally exposing the last 4 chars of the encrypted hex string.
  if (plain === value && value.includes(":")) return "****";
  return plain.slice(-4).padStart(plain.length, "*");
}
