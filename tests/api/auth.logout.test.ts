import { describe, it, expect } from 'vitest';
import { POST as postLogout } from '@/app/api/v1/auth/logout/route';
import { makeJsonRequest } from '../utils/next';

describe('POST /api/v1/auth/logout', () => {
  it('rejects cross-site logout attempts', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/logout',
      baseURL: 'http://localhost:3000',
      headers: {
        origin: 'https://evil.example.com',
      },
      cookies: { access_token: 'dummy' },
    });

    const res = await postLogout(req as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('logs out successfully when origin matches', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/logout',
      baseURL: 'http://localhost:3000',
      headers: {
        origin: 'http://localhost:3000',
        'content-type': 'application/json',
      },
      cookies: { access_token: 'dummy' },
    });

    const res = await postLogout(req as any);
    expect(res.status).toBe(204);
    // Clear-Site-Data header should be present for security
    expect(res.headers.get('Clear-Site-Data')).toContain('cookies');
  });
});

