import { describe, it, expect, vi } from 'vitest';
import { POST as postSignup } from '@/app/api/v1/auth/signup/route';
import { makeJsonRequest } from '../utils/next';
import * as ratelimit from '@/lib/ratelimit';
import * as authQueries from '@/app/db/queries/auth';
import * as signupRequests from '@/app/db/queries/signupRequests';
import * as conflicts from '@/utils/preflightConflicts';

vi.mock('@/lib/ratelimit', () => {
  const now = Date.now();
  return {
    getClientIp: vi.fn(() => '127.0.0.1'),
    checkSignupRateLimit: vi.fn(async () => ({ success: true, limit: 3, remaining: 3, reset: now + 3_600_000 })),
    getRateLimitHeaders: vi.fn(() => ({})),
  };
});

vi.mock('@/app/db/queries/auth', () => ({
  signupLocal: vi.fn(async () => ({ id: 'user-1', username: 'newuser' })),
}));

vi.mock('@/app/db/queries/signupRequests', () => ({
  createSignupRequest: vi.fn(async () => {}),
}));

vi.mock('@/utils/preflightConflicts', () => ({
  preflightConflicts: vi.fn(async () => []),
}));

const validBody = {
  username: 'newuser',
  name: 'New User',
  email: 'new@example.com',
  phone: '12345678',
  rank: 'OCT',
  password: 'Password1',
  confirmPassword: 'Password1',
  note: 'Test signup',
};

describe('POST /api/v1/auth/signup', () => {
  it('returns 429 when signup rate limit is exceeded', async () => {
    (ratelimit.checkSignupRateLimit as any).mockResolvedValueOnce({
      success: false,
      limit: 3,
      remaining: 0,
      reset: Date.now() + 3_600_000,
    });

    const req = makeJsonRequest({ method: 'POST', path: '/api/v1/auth/signup', body: validBody });
    const res = await postSignup(req as any);

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('too_many_requests');
  });

  it('returns 400 when validation fails', async () => {
    const badBody = { ...validBody, email: 'not-an-email', confirmPassword: 'mismatch' };
    const req = makeJsonRequest({ method: 'POST', path: '/api/v1/auth/signup', body: badBody });

    const res = await postSignup(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
    expect(body.message).toBe('Validation failed');
    expect(body.issues).toBeDefined();
  });

  it('returns 400 when preflight detects conflicts', async () => {
    (conflicts.preflightConflicts as any).mockResolvedValueOnce([
      { field: 'username', message: 'Username already in use' },
    ]);

    const req = makeJsonRequest({ method: 'POST', path: '/api/v1/auth/signup', body: validBody });
    const res = await postSignup(req as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
    expect(body.message).toBe('Already in use');
    expect(body.conflicts).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'username' })]),
    );
  });

  it('creates a disabled user and signup request on happy path', async () => {
    const req = makeJsonRequest({ method: 'POST', path: '/api/v1/auth/signup', body: validBody });
    const res = await postSignup(req as any);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user.id).toBe('user-1');
    expect(body.user.username).toBe('newuser');
    expect(body.user.isActive).toBe(false);
    expect(body.message).toMatch(/Signup received/i);
    expect(authQueries.signupLocal).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'newuser', isActive: false }),
    );
    expect(signupRequests.createSignupRequest).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
    );
  });
});

