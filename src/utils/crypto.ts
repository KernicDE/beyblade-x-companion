/**
 * Password-based encryption for the personal profile.
 *
 * The encrypted profile ships as a static file (public/data/profile.enc.json).
 * Format is intentionally identical to the Node scripts in scripts/encrypt-profile.cjs
 * so both sides can en-/decrypt the same payload:
 *
 *   { v, kdf: 'PBKDF2', hash: 'SHA-256', iterations, salt, iv, data }  (base64 fields)
 *
 * Key derivation: PBKDF2-SHA-256. Cipher: AES-256-GCM.
 */

export interface EncryptedPayload {
  v: 1;
  kdf: 'PBKDF2';
  hash: 'SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  data: string;
}

export const PBKDF2_ITERATIONS = 250000;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
  usages: KeyUsage[]
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    usages
  );
}

export async function encryptJson(value: unknown, password: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS, ['encrypt']);
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext
  );
  return {
    v: 1,
    kdf: 'PBKDF2',
    hash: 'SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptJson(payload: EncryptedPayload, password: string): Promise<unknown> {
  const salt = fromBase64(payload.salt);
  const iv = fromBase64(payload.iv);
  const data = fromBase64(payload.data);
  const key = await deriveKey(password, salt, payload.iterations, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    data as BufferSource
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (typeof value !== 'object' || value === null) return false;
  const raw = value as Record<string, unknown>;
  return (
    raw.v === 1 &&
    raw.kdf === 'PBKDF2' &&
    raw.hash === 'SHA-256' &&
    typeof raw.iterations === 'number' &&
    typeof raw.salt === 'string' &&
    typeof raw.iv === 'string' &&
    typeof raw.data === 'string'
  );
}
