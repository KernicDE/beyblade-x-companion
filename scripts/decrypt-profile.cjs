#!/usr/bin/env node
/**
 * Decrypts the shipped personal profile back into the gitignored working copy.
 *
 * Usage:
 *   BX_PROFILE_PASSWORD=<password> node scripts/decrypt-profile.cjs
 *
 * Input:  public/data/profile.enc.json
 * Output: .tmp/profile.plain.json   (gitignored)
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const INPUT = path.join(__dirname, '..', 'public', 'data', 'profile.enc.json');
const OUTPUT = path.join(__dirname, '..', '.tmp', 'profile.plain.json');

function fail(message) {
  console.error(`decrypt-profile: ${message}`);
  process.exit(1);
}

const password = process.env.BX_PROFILE_PASSWORD;
if (!password) {
  fail('BX_PROFILE_PASSWORD env var is required (never hardcode the password).');
}

if (!fs.existsSync(INPUT)) {
  fail(`input file not found: ${INPUT}`);
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
} catch (err) {
  fail(`input is not valid JSON: ${err.message}`);
}

if (payload.v !== 1 || payload.kdf !== 'PBKDF2' || typeof payload.iterations !== 'number') {
  fail('unsupported payload format.');
}

const salt = Buffer.from(payload.salt, 'base64');
const iv = Buffer.from(payload.iv, 'base64');
const data = Buffer.from(payload.data, 'base64');
const authTag = data.subarray(data.length - 16);
const ciphertext = data.subarray(0, data.length - 16);

const key = crypto.pbkdf2Sync(password, salt, payload.iterations, 32, 'sha256');
const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
decipher.setAuthTag(authTag);

let profile;
try {
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  profile = JSON.parse(plaintext.toString('utf8'));
} catch {
  fail('decryption failed — wrong password or corrupted file.');
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(profile, null, 2) + '\n');
console.log(`decrypt-profile: wrote ${OUTPUT}`);
