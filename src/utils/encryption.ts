import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// AES-256-GCM with a random IV per value, stored as "<ivHex>:<authTagHex>:<cipherHex>".
// The key is never committed: CI injects TEST_DATA_KEY (64 hex characters); locally
// it falls back to the git-ignored .test-data-key file. Create ciphertext with `npm run encrypt`.
const algorithm = 'aes-256-gcm';
const LOCAL_KEY_FILE = path.resolve(__dirname, '../../.test-data-key');

function loadKey(): Buffer {
  const fileKey = existsSync(LOCAL_KEY_FILE) ? readFileSync(LOCAL_KEY_FILE, 'utf8').trim() : '';
  const hexKey = process.env.TEST_DATA_KEY ?? fileKey;
  if (!/^[0-9a-f]{64}$/i.test(hexKey)) {
    throw new Error('Set TEST_DATA_KEY or create .test-data-key (64 hex characters) to read encrypted test data');
  }
  return Buffer.from(hexKey, 'hex');
}

export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, loadKey(), iv);
  const encrypted = cipher.update(plainText, 'utf8', 'hex') + cipher.final('hex');
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted}`;
}

export function decrypt(cipherText: string): string {
  const [ivHex, authTagHex, encrypted] = cipherText.split(':');
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted data format (expected "<ivHex>:<authTagHex>:<cipherHex>")');
  }

  const decipher = crypto.createDecipheriv(algorithm, loadKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}
