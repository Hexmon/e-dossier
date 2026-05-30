import { promisify } from 'node:util';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'node:crypto';

const scryptAsync = promisify(scrypt);

async function deriveKey(password: string, salt: Buffer) {
  return (await scryptAsync(password, salt, 32)) as Buffer;
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
