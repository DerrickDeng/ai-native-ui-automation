// Reads one value from stdin and prints its ciphertext for src/data or an eval fixture.
// Usage: printf '%s' "$VALUE" | npm run --silent encrypt
// Mirrors encrypt() in src/utils/encryption.ts so it runs on plain Node.
import { Buffer } from 'node:buffer';
import console from 'node:console';
import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';

const keyFile = new URL('../.test-data-key', import.meta.url);
const fileKey = existsSync(keyFile) ? readFileSync(keyFile, 'utf8').trim() : '';
const hexKey = process.env.TEST_DATA_KEY ?? fileKey;
if (!/^[0-9a-f]{64}$/i.test(hexKey)) {
  console.error('Set TEST_DATA_KEY or create .test-data-key (64 hex characters)');
  process.exit(1);
}

let plainText = '';
for await (const chunk of process.stdin) {
  plainText += chunk;
}
if (!plainText) {
  console.error('Nothing to encrypt: pipe the value on stdin');
  process.exit(1);
}

const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(hexKey, 'hex'), iv);
const encrypted = cipher.update(plainText, 'utf8', 'hex') + cipher.final('hex');
console.log(`${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted}`);
