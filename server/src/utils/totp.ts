import { createHmac, randomBytes } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateSecret(length = 32): string {
  const bytes = randomBytes(length);
  return Array.from(bytes)
    .map((b) => BASE32_ALPHABET[b % 32])
    .join('');
}

function base32Decode(secret: string): Buffer {
  const cleaned = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const char of cleaned) {
    const val = BASE32_ALPHABET.indexOf(char);
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    buf[i] = c & 0xff;
    c = c >> 8;
  }
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return (code % 1_000_000).toString().padStart(6, '0');
}

export function totp(secret: string, windowSeconds = 30): string {
  const counter = Math.floor(Date.now() / 1000 / windowSeconds);
  return hotp(secret, counter);
}

export function verifyTotp(secret: string, code: string, windows = 1): boolean {
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let i = -windows; i <= windows; i++) {
    if (hotp(secret, counter + i) === code) {
      return true;
    }
  }
  return false;
}

export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 4)).join('-').toUpperCase()
  );
}

export function getAuthenticatorUri(username: string, secret: string, issuer = 'Beyblade X Database'): string {
  const label = encodeURIComponent(`${issuer}:${username}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}
