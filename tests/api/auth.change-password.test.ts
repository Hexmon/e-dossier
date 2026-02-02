import { describe, it, expect, vi } from 'vitest';
import { POST as postChangePassword } from '@/app/api/v1/auth/change-password/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as authz from '@/app/lib/authz';

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
  hasAdminRole: vi.fn(() => false),
}));

vi.mock('@/app/db/client', () => ({
  db: {
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            { id: 'user-2', deletedAt: null, userId: 'user-2', passwordHash: 'old-hash' },
          ],
        }),
      }),
    })),
    insert: vi.fn(() => ({
      values: () => ({
        onConflictDoUpdate: async () => {},
      }),
    })),
  },
}));

vi.mock('argon2', () => ({
  default: {
    verify: vi.fn(async () => true),
    hash: vi.fn(async () => 'new-hash'),
  },
}));

const path = '/api/v1/auth/change-password';

describe('POST /api/v1/auth/change-password', () => {
  it('returns 401 when authentication fails', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({ method: 'POST', path, body: {} });
    const res = await postChangePassword(req as any, createRouteContext());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 400 when body is not valid JSON', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'user-1', roles: [] });
    const req: any = makeJsonRequest({ method: 'POST', path, body: null });
    req.json = async () => {
      throw new Error('boom');
    };

    const res = await postChangePassword(req as any, createRouteContext());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('invalid_json');
  });

  it('returns 400 when request body fails schema validation', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'user-1', roles: [] });
    const req = makeJsonRequest({ method: 'POST', path, body: { foo: 'bar' } });

    const res = await postChangePassword(req as any, createRouteContext());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('forbids non-admin from changing another user\'s password', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'user-1', roles: [] });
    (authz.hasAdminRole as any).mockReturnValueOnce(false);

    const body = {
      userId: '5f01fd9d-11e0-43e1-bf49-bc64ebd3e49b',
      newPassword: 'NewPassword1',
      currentPassword: 'CurrentPassword1',
    };
    const req = makeJsonRequest({ method: 'POST', path, body });

    const res = await postChangePassword(req as any, createRouteContext());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe('forbidden');
  });

  it('allows admin to reset another user\'s password', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (authz.hasAdminRole as any).mockReturnValueOnce(true);

    const body = {
      userId: '5f01fd9d-11e0-43e1-bf49-bc64ebd3e49b',
      newPassword: 'NewPassword1',
    };
    const req = makeJsonRequest({ method: 'POST', path, body });

    const res = await postChangePassword(req as any, createRouteContext());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.userId).toBe('5f01fd9d-11e0-43e1-bf49-bc64ebd3e49b');
  });
});
