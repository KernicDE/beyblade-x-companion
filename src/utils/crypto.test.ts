import { describe, it, expect } from 'vitest';
import { decryptJson, encryptJson, isEncryptedPayload } from './crypto';

describe('profile encryption', () => {
  it('round-trips a JSON value', async () => {
    const value = { version: 1, ownedBeys: [{ beyId: 'dran-sword3-60f-bx-01' }], matches: [] };
    const payload = await encryptJson(value, 'correct-horse');
    expect(isEncryptedPayload(payload)).toBe(true);
    const decrypted = await decryptJson(payload, 'correct-horse');
    expect(decrypted).toEqual(value);
  });

  it('produces a different payload each time (random salt/iv)', async () => {
    const a = await encryptJson({ x: 1 }, 'pw');
    const b = await encryptJson({ x: 1 }, 'pw');
    expect(a.salt).not.toBe(b.salt);
    expect(a.data).not.toBe(b.data);
  });

  it('fails with the wrong password', async () => {
    const payload = await encryptJson({ secret: true }, 'right');
    await expect(decryptJson(payload, 'wrong')).rejects.toThrow();
  });

  it('rejects malformed payloads', () => {
    expect(isEncryptedPayload(null)).toBe(false);
    expect(isEncryptedPayload({})).toBe(false);
    expect(isEncryptedPayload({ v: 1, kdf: 'PBKDF2', hash: 'SHA-256', iterations: 1 })).toBe(false);
  });
});
