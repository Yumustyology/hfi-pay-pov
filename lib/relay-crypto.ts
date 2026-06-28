import crypto from "crypto";

const RELAY_SECRET =
  process.env.RELAY_ENCRYPTION_KEY || "hfi-demo-secret-key-32-chars-pad!";

/**
 * Normalize email before hashing (trim + lowercase)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * SHA-256 hash of normalized email
 * Used as the public identifier for routing - no PII exposed
 */
export function hashIdentifier(email: string): string {
  return crypto
    .createHash("sha256")
    .update(normalizeEmail(email))
    .digest("hex");
}

/**
 * AES-256-CBC encrypt email
 * Only the home relay (holding RELAY_ENCRYPTION_KEY) can decrypt
 */
export function encryptEmail(email: string): string {
  const key = crypto.scryptSync(RELAY_SECRET, "hfi-salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(normalizeEmail(email), "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * AES-256-CBC decrypt email
 * Used by the home relay to resolve identity for notifications
 */
export function decryptEmail(encryptedEmail: string): string {
  const key = crypto.scryptSync(RELAY_SECRET, "hfi-salt", 32);
  const [ivHex, encHex] = encryptedEmail.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}
