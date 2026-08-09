import { afterEach, describe, expect, it } from 'vitest';
import {
  decryptSsbStoredPassword,
  encryptSsbStoredPassword,
} from '@/app/lib/ssb-upload-crypto';

const originalEnvironment = {
  nodeEnv: process.env.NODE_ENV,
  ssbSecret: process.env.SSB_UPLOAD_PASSWORD_SECRET,
  csrfSecret: process.env.CSRF_SECRET,
  accessPrivateKey: process.env.ACCESS_TOKEN_PRIVATE_KEY,
};

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restore('NODE_ENV', originalEnvironment.nodeEnv);
  restore('SSB_UPLOAD_PASSWORD_SECRET', originalEnvironment.ssbSecret);
  restore('CSRF_SECRET', originalEnvironment.csrfSecret);
  restore('ACCESS_TOKEN_PRIVATE_KEY', originalEnvironment.accessPrivateKey);
});

describe('SSB saved-password encryption compatibility', () => {
  it('continues to encrypt and reveal passwords when only the legacy CSRF secret is configured', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SSB_UPLOAD_PASSWORD_SECRET;
    process.env.CSRF_SECRET = 'legacy-production-csrf-secret';
    delete process.env.ACCESS_TOKEN_PRIVATE_KEY;

    const ciphertext = encryptSsbStoredPassword('saved-report-password');

    expect(ciphertext).toMatch(/^v1:/);
    expect(decryptSsbStoredPassword(ciphertext)).toBe('saved-report-password');
  });

  it('reveals an existing legacy password after a dedicated SSB secret is added', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SSB_UPLOAD_PASSWORD_SECRET;
    process.env.CSRF_SECRET = 'legacy-production-csrf-secret';
    delete process.env.ACCESS_TOKEN_PRIVATE_KEY;
    const legacyCiphertext = encryptSsbStoredPassword('existing-password');

    process.env.SSB_UPLOAD_PASSWORD_SECRET = 'new-dedicated-ssb-secret';

    expect(decryptSsbStoredPassword(legacyCiphertext)).toBe('existing-password');
  });

  it('returns null instead of throwing when no configured key can decrypt the value', () => {
    process.env.NODE_ENV = 'production';
    process.env.SSB_UPLOAD_PASSWORD_SECRET = 'original-key';
    delete process.env.CSRF_SECRET;
    delete process.env.ACCESS_TOKEN_PRIVATE_KEY;
    const ciphertext = encryptSsbStoredPassword('saved-report-password');

    process.env.SSB_UPLOAD_PASSWORD_SECRET = 'different-key';

    expect(decryptSsbStoredPassword(ciphertext)).toBeNull();
  });
});
