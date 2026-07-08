import { promisify } from 'node:util';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt } from 'node:crypto';

const scryptAsync = promisify(scrypt);

async function deriveKey(password: string, salt: Buffer) {
  return (await scryptAsync(password, salt, 32)) as Buffer;
}

function getStoredPasswordKey() {
  const secret = process.env.SSB_UPLOAD_PASSWORD_SECRET?.trim();
  if (!secret) return null;

  return createHash('sha256').update(secret).digest();
}

export async function encryptSsbPdf(input: Buffer, password: string) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(password, salt);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);

  return {
    encrypted,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
}

export async function decryptSsbPdf(input: Uint8Array, password: string, metadata: {
  salt: string;
  iv: string;
  authTag: string;
}) {
  const key = await deriveKey(password, Buffer.from(metadata.salt, 'hex'));
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(metadata.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(metadata.authTag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(input)), decipher.final()]);
}

export function encryptSsbStoredPassword(password: string) {
  const key = getStoredPasswordKey();
  if (!key) return null;

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSsbStoredPassword(payload: string | null | undefined) {
  try {
    if (!payload) return null;
    const [version, iv, authTag, encrypted] = payload.split(':');
    if (version !== 'v1' || !iv || !authTag || !encrypted) return null;

    const key = getStoredPasswordKey();
    if (!key) return null;

    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}
