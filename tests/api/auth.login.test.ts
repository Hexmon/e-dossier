import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as postLogin } from '@/app/api/v1/auth/login/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';
import * as accountLockout from '@/app/db/queries/account-lockout';
import * as effectiveAuthority from '@/app/lib/effective-authority';
import * as jwt from '@/app/lib/jwt';
import * as cookies from '@/app/lib/cookies';
import * as ratelimit from '@/lib/ratelimit';
import { getSetupStatus } from '@/app/lib/setup-status';

vi.mock('@/lib/ratelimit', () => {
  return {
    checkLoginRateLimit: vi.fn(async () => ({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 900_000,
    })),
    getClientIp: vi.fn(() => '127.0.0.1'),
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
  clearFailedAttempts: vi.fn(async () => undefined),
}));

vi.mock('@/app/lib/jwt', () => ({
  signAccessJWT: vi.fn(async () => 'fake-access-token'),
}));

vi.mock('@/app/lib/cookies', () => ({
  setAccessCookie: vi.fn(),
}));

vi.mock('@/app/lib/setup-status', () => ({
  getSetupStatus: vi.fn(),
  isSetupStatusUnavailable: (status: any) => status.availability?.ok === false,
}));

vi.mock('argon2', () => ({
  default: {
    verify: vi.fn(async () => true),
  },
}));

const loginBody = {
  appointmentId,
  password: 'password123',
};

beforeEach(() => {
  vi.clearAllMocks();
  (getSetupStatus as any).mockResolvedValue({
    bootstrapRequired: false,
    setupComplete: true,
    nextStep: null,
  });
});

describe('POST /api/v1/auth/login', () => {
  it('blocks login when the account is currently locked', async () => {
    const lockedUntil = new Date(Date.now() + 30 * 60_000);
    (accountLockout.isAccountLocked as any).mockResolvedValueOnce({
      lockedUntil,
      failedAttempts: 5,
    });
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: loginBody,
    });

    const res = await postLogin(req as any, createRouteContext());
    expect(res.status).toBe(423);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('ACCOUNT_LOCKED');
    expect(body.lockedUntil).toBe(lockedUntil.toISOString());
    expect(jwt.signAccessJWT).not.toHaveBeenCalled();
  });

  it('returns 429 when login rate limit is exceeded', async () => {
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
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('rate_limited');
    expect(effectiveAuthority.getAuthorityForLogin).not.toHaveBeenCalled();
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
    expect(body.missing).toContain('password');
    expect(body.missing).not.toContain('username');
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
    expect(accountLockout.clearFailedAttempts).toHaveBeenCalledWith('testuser');
  });

  it('derives username from appointment authority and ignores legacy username input', async () => {
    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: {
        appointmentId,
        username: 'wrong-frontend-user',
        password: 'password123',
      },
    });

    const res = await postLogin(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.user.username).toBe('testuser');
    expect(accountLockout.recordLoginAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'testuser', success: true }),
    );
    expect(accountLockout.clearFailedAttempts).toHaveBeenCalledWith('testuser');
  });

  it('logs in with a platoon-scoped appointment without frontend platoonId', async () => {
    (effectiveAuthority.getAuthorityForLogin as any).mockResolvedValueOnce({
      authorityKind: 'APPOINTMENT',
      authorityId: appointmentId,
      appointmentId,
      delegationId: null,
      userId: 'user-1',
      username: 'testuser',
      positionId: 'position-2',
      positionKey: 'PTN_CDR',
      positionName: 'Platoon Commander',
      defaultScope: 'PLATOON',
      scopeType: 'PLATOON',
      scopeId: '33333333-3333-4333-8333-333333333333',
      platoonKey: 'alpha',
      platoonName: 'Alpha Platoon',
      startsAt: new Date('2026-04-04T00:00:00.000Z'),
      endsAt: null,
      grantorUserId: null,
      grantorUsername: null,
      grantorAppointmentId: null,
    });

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: loginBody,
    });

    const res = await postLogin(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.active_appointment.scope).toEqual({
      type: 'PLATOON',
      id: '33333333-3333-4333-8333-333333333333',
    });
  });

  it('blocks non-admin login while initial setup is incomplete', async () => {
    (effectiveAuthority.getAuthorityForLogin as any).mockResolvedValueOnce({
      authorityKind: 'APPOINTMENT',
      authorityId: appointmentId,
      appointmentId,
      delegationId: null,
      userId: 'user-1',
      username: 'testuser',
      positionId: 'position-2',
      positionKey: 'TRAINING_OFFICER',
      positionName: 'Training Officer',
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
    });
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: false,
      setupComplete: false,
      nextStep: 'courses',
    });

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: loginBody,
    });

    const res = await postLogin(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(423);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('setup_incomplete');
    expect(body.nextStep).toBe('courses');
    expect(jwt.signAccessJWT).not.toHaveBeenCalled();
    expect(cookies.setAccessCookie).not.toHaveBeenCalled();
  });

  it('allows admin login while initial setup is incomplete', async () => {
    (getSetupStatus as any).mockResolvedValueOnce({
      bootstrapRequired: false,
      setupComplete: false,
      nextStep: 'courses',
    });

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: loginBody,
    });

    const res = await postLogin(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.roles).toContain('ADMIN');
  });

  it('returns 401 for an invalid password and evaluates lockout escalation', async () => {
    const argon2 = await import('argon2');
    vi.mocked(argon2.default.verify).mockResolvedValueOnce(false);

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: loginBody,
    });

    const res = await postLogin(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('BAD_PASSWORD');
    expect(accountLockout.recordLoginAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', success: false, failureReason: 'Invalid password' }),
    );
    expect(accountLockout.checkAndLockAccount).toHaveBeenCalledWith('testuser', 'user-1', '127.0.0.1');
  });

  it('returns 423 when a failed password reaches lockout threshold', async () => {
    const argon2 = await import('argon2');
    const lockedUntil = new Date(Date.now() + 30 * 60_000);
    vi.mocked(argon2.default.verify).mockResolvedValueOnce(false);
    (accountLockout.checkAndLockAccount as any).mockResolvedValueOnce({
      lockedUntil,
      failedAttempts: 5,
    });

    const req = makeJsonRequest({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: loginBody,
    });

    const res = await postLogin(req as any, createRouteContext());
    const body = await res.json();

    expect(res.status).toBe(423);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('ACCOUNT_LOCKED');
    expect(body.failedAttempts).toBe(5);
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
