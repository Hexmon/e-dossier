import { describe, it, expect, vi } from 'vitest';
import { POST as postLogout } from '@/app/api/v1/auth/logout/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';

vi.mock('@/lib/audit-log', () => ({
  createAuditLog: vi.fn(async () => {}),
  logApiRequest: vi.fn(),
  ensureRequestContext: vi.fn(() => ({
    requestId: 'test',
    method: 'GET',
    pathname: '/',
    url: '/',
    startTime: Date.now(),
  })),
  noteRequestActor: vi.fn(),
  setRequestTenant: vi.fn(),
  AuditEventType: {
    LOGOUT: 'auth.logout',
    API_REQUEST: 'api.request',
  },
  AuditResourceType: {
    USER: 'user',
    API: 'api',
  },
}));

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(async () => {
    throw new Error('no-session');
  }),
}));

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

    const res = await postLogout(req as any, createRouteContext());
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

    const res = await postLogout(req as any, createRouteContext());
    expect(res.status).toBe(204);
    // Clear-Site-Data header should be present for security
    expect(res.headers.get('Clear-Site-Data')).toContain('cookies');
  });
});
