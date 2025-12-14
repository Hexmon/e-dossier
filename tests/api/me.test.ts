import { describe, it, expect, vi } from 'vitest';
import { GET as getMe } from '@/app/api/v1/me/route';
import { makeJsonRequest } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as guard from '@/app/lib/guard';
import { db } from '@/app/db/client';

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
    API_REQUEST: 'api.request',
  },
  AuditResourceType: {
    USER: 'user',
  },
}));

vi.mock('@/app/lib/guard', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/db/client', () => {
  const select = vi.fn(() => ({
    from: () => ({
      where: async () => [
        {
          id: 'user-1',
          username: 'testuser',
          email: 'test@example.com',
          phone: '12345678',
          name: 'Test User',
          rank: 'OCT',
          currentAppointmentId: 'apt-1',
        },
      ],
    }),
  }));
  return { db: { select } };
});

const path = '/api/v1/me';

describe('GET /api/v1/me', () => {
  it('returns 401 when authentication fails', async () => {
    (guard.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({ method: 'GET', path });
    const res = await getMe(req as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 404 when the user no longer exists', async () => {
    (guard.requireAuth as any).mockResolvedValueOnce({ userId: 'missing', roles: [] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({ where: async () => [] }),
    }));

    const req = makeJsonRequest({ method: 'GET', path });
    const res = await getMe(req as any);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('not_found');
  });

  it('returns current user profile on happy path', async () => {
    (guard.requireAuth as any).mockResolvedValueOnce({
      userId: 'user-1',
      roles: ['ADMIN'],
      apt: { id: 'apt-1', position: 'ADMIN' },
    });

    const req = makeJsonRequest({ method: 'GET', path });
    const res = await getMe(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user.id).toBe('user-1');
    expect(body.user.username).toBe('testuser');
    expect(body.roles).toContain('ADMIN');
    expect(body.apt).toEqual({ id: 'apt-1', position: 'ADMIN' });
  });
});
