import { promisify } from 'node:util';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt } from 'node:crypto';

const scryptAsync = promisify(scrypt);
const NON_PROD_PASSWORD_SECRET = 'dev-ssb-upload-password-secret-change-in-production';

async function deriveKey(password: string, salt: Buffer) {
  return (await scryptAsync(password, salt, 32)) as Buffer;
}

function getStoredPasswordSecrets() {
  const secrets = [
    process.env.SSB_UPLOAD_PASSWORD_SECRET,
    // Legacy records were encrypted with these fallbacks before the dedicated
    // SSB secret was introduced. Keep them for zero-loss password recovery.
    process.env.CSRF_SECRET,
    process.env.ACCESS_TOKEN_PRIVATE_KEY,
    process.env.NODE_ENV === 'production' ? null : NON_PROD_PASSWORD_SECRET,
  ]
    .map((secret) => secret?.trim())
    .filter((secret): secret is string => Boolean(secret));

  return Array.from(new Set(secrets));
}

function deriveStoredPasswordKey(secret: string) {
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
  const [secret] = getStoredPasswordSecrets();
  if (!secret) return null;

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveStoredPasswordKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSsbStoredPassword(payload: string | null | undefined) {
  if (!payload) return null;
  const [version, iv, authTag, encrypted] = payload.split(':');
  if (version !== 'v1' || !iv || !authTag || !encrypted) return null;

  for (const secret of getStoredPasswordSecrets()) {
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        deriveStoredPasswordKey(secret),
        Buffer.from(iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      return Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'hex')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      // Try the next legacy key without exposing which deployment secret matched.
    }
  }

  return null;
}
