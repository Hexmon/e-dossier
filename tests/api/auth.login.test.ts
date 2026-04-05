import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as postLogin } from '@/app/api/v1/auth/login/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';
import * as ratelimit from '@/lib/ratelimit';
import * as accountLockout from '@/app/db/queries/account-lockout';
import * as effectiveAuthority from '@/app/lib/effective-authority';
import * as jwt from '@/app/lib/jwt';
import * as cookies from '@/app/lib/cookies';

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
const delegationId = '22222222-2222-4222-8222-222222222222';

vi.mock('@/app/lib/effective-authority', () => ({
  getAuthorityForLogin: vi.fn(async () => ({
    authorityKind: 'APPOINTMENT',
    authorityId: appointmentId,
    appointmentId,
    delegationId: null,
    userId: 'user-1',
    username: 'testuser',
    positionId: 'position-1',
    positionKey: 'ADMIN',
    positionName: 'Admin',
    defaultScope: 'GLOBAL',
    scopeType: 'GLOBAL',
    scopeId: null,
    platoonKey: null,
    platoonName: null,
    startsAt: new Date('2026-04-04T00:00:00.000Z'),
    endsAt: null,
    grantorUserId: null,
    grantorUsername: null,
    grantorAppointmentId: null,
  })),
  buildAuthorityRoleKeys: vi.fn(async () => ['ADMIN']),
}));

vi.mock('@/app/db/queries/account-lockout', () => ({
  recordLoginAttempt: vi.fn(async () => {}),
  isAccountLocked: vi.fn(async () => null),
  checkAndLockAccount: vi.fn(async () => null),
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

    const res = await postLogin(req as any, createRouteContext());
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

    const res = await postLogin(req as any, createRouteContext());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('missing_fields');
    expect(body.missing).toContain('appointmentId|delegationId');
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

    const res = await postLogin(req as any, createRouteContext());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('invalid_json');
  });

  it('logs in successfully with valid credentials and active appointment', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: loginBody,
    });

    const res = await postLogin(req as any, createRouteContext());
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
  });

  it('logs in successfully with an active delegation identity', async () => {
    (effectiveAuthority.getAuthorityForLogin as any).mockResolvedValueOnce({
      authorityKind: 'DELEGATION',
      authorityId: delegationId,
      appointmentId,
      delegationId,
      userId: 'user-2',
      username: 'delegateuser',
      positionId: 'position-2',
      positionKey: 'TRAINING_OFFICER',
      positionName: 'Training Officer',
      defaultScope: 'PLATOON',
      scopeType: 'PLATOON',
      scopeId: '33333333-3333-4333-8333-333333333333',
      platoonKey: 'alpha',
      platoonName: 'Alpha Platoon',
      startsAt: new Date('2026-04-04T00:00:00.000Z'),
      endsAt: null,
      grantorUserId: 'user-1',
      grantorUsername: 'grantoruser',
      grantorAppointmentId: appointmentId,
    });
    (effectiveAuthority.buildAuthorityRoleKeys as any).mockResolvedValueOnce([
      'TRAINING_OFFICER',
      'PLATOON_COMMANDER_EQUIVALENT',
    ]);

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: {
        delegationId,
        platoonId: '33333333-3333-4333-8333-333333333333',
        username: 'delegateuser',
        password: 'password123',
      },
    });

    const res = await postLogin(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.active_appointment.kind).toBe('DELEGATION');
    expect(body.active_appointment.delegationId).toBe(delegationId);
    expect(body.roles).toContain('PLATOON_COMMANDER_EQUIVALENT');
  });
});
