import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// AES-256-GCM encryption for credentials at rest.
// Format stored in DB: base64( iv(12) | authTag(16) | ciphertext ).
const SECRET = process.env.CREDENTIAL_SECRET ?? process.env.SESSION_SECRET ?? "dev-credential-secret";
const KEY = scryptSync(SECRET, "engageflow-credential-salt", 32);

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(stored: string): string {
  const raw = Buffer.from(stored, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// A masked hint so the UI can show "set" without revealing the value.
export function maskSecret(): string {
  return "••••••••";
}
