import { describe, expect, it } from 'vitest';
import { decodeJwtPayloadUnsafe } from '@/app/lib/jwt-unsafe';

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

describe('decodeJwtPayloadUnsafe', () => {
  it('decodes payload without signature verification', () => {
    const header = toBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = toBase64Url(JSON.stringify({ sub: 'user-1', roles: ['ADMIN'] }));
    const token = `${header}.${payload}.signature`;

    expect(decodeJwtPayloadUnsafe(token)).toMatchObject({ sub: 'user-1' });
  });

  it('returns null for malformed tokens', () => {
    expect(decodeJwtPayloadUnsafe('not-a-jwt')).toBeNull();
    expect(decodeJwtPayloadUnsafe('a.b')).toBeNull();
  });
});

