import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as postLogin } from '@/app/api/v1/auth/login/route';
import { makeJsonRequest } from '../utils/next';
import * as ratelimit from '@/lib/ratelimit';
import * as accountLockout from '@/app/db/queries/account-lockout';
import * as auditLog from '@/lib/audit-log';
import * as appointmentsQueries from '@/app/db/queries/appointments';
import * as jwt from '@/app/lib/jwt';
import * as cookies from '@/app/lib/cookies';
import argon2 from 'argon2';

vi.mock('@/lib/ratelimit', () => {
  const now = Date.now();
  return {
    getClientIp: vi.fn(() => '127.0.0.1'),
    checkLoginRateLimit: vi.fn(async () => ({
      success: true,
      limit: 5,
      remaining: 5,
      reset: now + 60_000,
    })),
    checkSignupRateLimit: vi.fn(async () => ({
      success: true,
      limit: 3,
      remaining: 3,
      reset: now + 3_600_000,
    })),
    getRateLimitHeaders: vi.fn(() => ({})),
  };
});

vi.mock('@/app/db/client', () => {
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => [
          {
            userId: 'user-1',
            passwordHash: 'hashed-password',
            passwordUpdatedAt: null,
          },
        ]),
      })),
    })),
  }));
  return { db: { select } };
});

const appointmentId = '11111111-1111-4111-8111-111111111111';

vi.mock('@/app/db/queries/appointments', () => ({
  getActiveAppointmentWithHolder: vi.fn(async () => ({
    id: appointmentId,
    userId: 'user-1',
    username: 'testuser',
    positionKey: 'ADMIN',
    scopeType: 'GLOBAL',
    scopeId: null,
    startsAt: new Date().toISOString(),
    endsAt: null,
  })),
}));

vi.mock('@/app/db/queries/account-lockout', () => ({
  recordLoginAttempt: vi.fn(async () => {}),
  isAccountLocked: vi.fn(async () => null),
  checkAndLockAccount: vi.fn(async () => null),
}));

vi.mock('@/lib/audit-log', () => ({
  createAuditLog: vi.fn(async () => {}),
  logLoginSuccess: vi.fn(async () => {}),
  logLoginFailure: vi.fn(async () => {}),
  logAccountLocked: vi.fn(async () => {}),
  logApiRequest: vi.fn(),
  ensureRequestContext: vi.fn(() => ({
    requestId: 'test',
    method: 'POST',
    pathname: '/',
    url: '/',
    startTime: Date.now(),
  })),
  noteRequestActor: vi.fn(),
  setRequestTenant: vi.fn(),
  AuditEventType: {
    API_REQUEST: 'api.request',
  },
  AuditResourceType: {
    API: 'api',
  },
}));

vi.mock('@/app/lib/jwt', () => ({
  signAccessJWT: vi.fn(async () => 'fake-access-token'),
}));

vi.mock('@/app/lib/cookies', () => ({
  setAccessCookie: vi.fn(),
}));

vi.mock('argon2', () => ({
  default: {
    verify: vi.fn(async () => true),
  },
}));

const loginBody = {
  appointmentId,
  username: 'testuser',
  password: 'password123',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/auth/login', () => {
  it('returns 429 when rate limit is exceeded', async () => {
    (ratelimit.checkLoginRateLimit as any).mockResolvedValueOnce({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: loginBody,
    });

    const res = await postLogin(req as any);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('too_many_requests');
  });

  it('returns 400 when required fields are missing', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: {},
    });

    const res = await postLogin(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('missing_fields');
    expect(body.missing).toContain('appointmentId');
    expect(body.missing).toContain('username');
    expect(body.missing).toContain('password');
  });

  it('returns 400 when body is not valid JSON', async () => {
    const req: any = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: null,
    });
    req.json = async () => {
      throw new Error('boom');
    };

    const res = await postLogin(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('invalid_json');
  });

  it('logs in successfully with valid credentials and active appointment', async () => {
    (appointmentsQueries.getActiveAppointmentWithHolder as any).mockResolvedValueOnce({
      id: appointmentId,
      userId: 'user-1',
      username: 'testuser',
      positionKey: 'ADMIN',
      scopeType: 'GLOBAL',
      scopeId: null,
      startsAt: new Date().toISOString(),
      endsAt: null,
    });

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: loginBody,
    });

    const res = await postLogin(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user.id).toBe('user-1');
    expect(body.roles).toContain('ADMIN');
    expect(body.token_type).toBe('Bearer');
    expect(jwt.signAccessJWT).toHaveBeenCalled();
    expect(cookies.setAccessCookie).toHaveBeenCalled();
    expect(accountLockout.recordLoginAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', success: true }),
    );
    expect(auditLog.logLoginSuccess).toHaveBeenCalled();
  });
});
