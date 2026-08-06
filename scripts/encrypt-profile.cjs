#!/usr/bin/env node
/**
 * Encrypts the plaintext personal profile into the static file shipped with the app.
 *
 * Usage:
 *   BX_PROFILE_PASSWORD=<password> node scripts/encrypt-profile.cjs
 *
 * Input:  .tmp/profile.plain.json   (gitignored working copy)
 * Output: public/data/profile.enc.json
 *
 * Format matches src/utils/crypto.ts (PBKDF2-SHA-256 + AES-256-GCM, base64 fields).
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ITERATIONS = 250000;
const INPUT = path.join(__dirname, '..', '.tmp', 'profile.plain.json');
const OUTPUT = path.join(__dirname, '..', 'public', 'data', 'profile.enc.json');

function fail(message) {
  console.error(`encrypt-profile: ${message}`);
  process.exit(1);
}

const password = process.env.BX_PROFILE_PASSWORD;
if (!password) {
  fail('BX_PROFILE_PASSWORD env var is required (never hardcode the password).');
}

if (!fs.existsSync(INPUT)) {
  fail(`input file not found: ${INPUT}`);
}

let profile;
try {
  profile = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
} catch (err) {
  fail(`input is not valid JSON: ${err.message}`);
}

if (
  typeof profile !== 'object' ||
  profile === null ||
  ![1, 2].includes(profile.version) ||
  !Array.isArray(profile.ownedBeys) ||
  !Array.isArray(profile.ownedParts) ||
  !Array.isArray(profile.version === 2 ? profile.builds : profile.creations) ||
  !Array.isArray(profile.matches)
) {
  fail('input does not look like a PersonalProfile (version 1/2 + ownedBeys/ownedParts/builds|creations/matches arrays).');
}

const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const plaintext = Buffer.from(JSON.stringify(profile), 'utf8');
const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

const payload = {
  v: 1,
  kdf: 'PBKDF2',
  hash: 'SHA-256',
  iterations: ITERATIONS,
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  data: Buffer.concat([ciphertext, cipher.getAuthTag()]).toString('base64'),
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2) + '\n');
console.log(`encrypt-profile: wrote ${OUTPUT} (${profile.ownedBeys.length} beys, ${profile.ownedParts.length} parts, ${profile.matches.length} matches)`);
