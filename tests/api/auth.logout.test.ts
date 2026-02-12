import { describe, it, expect, vi } from 'vitest';
import { POST as postLogout } from '@/app/api/v1/auth/logout/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';

const auditLogMock = vi.fn(async () => {});

vi.mock('@/lib/audit', () => ({
  withAuditRoute: (_method: string, handler: any) => {
    return (req: any, context: any) => {
      req.audit = { log: auditLogMock };
      return handler(req, context);
    };
  },
  AuditEventType: {
    LOGOUT: 'AUTH.LOGOUT',
  },
  AuditResourceType: {
    USER: 'user',
  },
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

  it('logs out successfully when origin matches and clears cookie', async () => {
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
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('access_token=');
    expect(setCookie.toLowerCase()).toContain('max-age=0');
    expect(res.headers.get('Cache-Control')).toContain('no-store');
    expect(res.headers.get('Clear-Site-Data')).toContain('cookies');
  });

  it('logs out successfully without token cookie on same-origin request', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/logout',
      baseURL: 'http://localhost:3000',
      headers: {
        origin: 'http://localhost:3000',
        'content-type': 'application/json',
      },
    });

    const res = await postLogout(req as any, createRouteContext());
    expect(res.status).toBe(204);
  });

  it('does not fail logout when audit logging fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    auditLogMock.mockRejectedValueOnce(new Error('audit failed'));

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
    await Promise.resolve();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
