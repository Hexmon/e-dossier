import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getPlatoons, POST as postPlatoon, DELETE as deleteAllPlatoons } from '@/app/api/v1/platoons/route';
import { makeJsonRequest } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as authz from '@/app/lib/authz';
import { db } from '@/app/db/client';

vi.mock('@/app/lib/authz', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/app/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

const path = '/api/v1/platoons';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/platoons', () => {
  it('returns platoons with optional filters', async () => {
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          orderBy: async () => [
            { id: 'p1', key: 'A1', name: 'Platoon A1', about: null },
          ],
        }),
      }),
    }));
    const req = makeJsonRequest({
      method: 'GET',
      path: `${path}?q=a1&includeDeleted=true`,
    });
    const res = await getPlatoons(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].key).toBe('A1');
  });
});

describe('POST /api/v1/platoons', () => {
  it('returns 401 when not authenticated as admin', async () => {
    (authz.requireAdmin as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );
    const req = makeJsonRequest({ method: 'POST', path, body: {} });
    const res = await postPlatoon(req as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 400 when body fails validation', async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    const req = makeJsonRequest({
      method: 'POST',
      path,
      body: { key: 'x', name: '' },
    });
    const res = await postPlatoon(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns 409 when platoon key or name already exists', async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 'p1', key: 'A1', name: 'Platoon A1' }],
        }),
      }),
    }));
    const req = makeJsonRequest({
      method: 'POST',
      path,
      body: { key: 'A1', name: 'Platoon A1' },
    });
    const res = await postPlatoon(req as any);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('conflict');
  });

  it('creates platoon on happy path', async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }));
    (db.insert as any).mockImplementationOnce(() => ({
      values: () => ({
        returning: async () => [{ id: 'p1', key: 'A1', name: 'Platoon A1', about: null }],
      }),
    }));
    const req = makeJsonRequest({
      method: 'POST',
      path,
      body: { key: 'A1', name: 'Platoon A1' },
    });
    const res = await postPlatoon(req as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.platoon.key).toBe('A1');
  });
});

describe('DELETE /api/v1/platoons', () => {
  it('returns 403 when user lacks admin privileges', async () => {
    (authz.requireAdmin as any).mockRejectedValueOnce(
      new ApiError(403, 'Admin privileges required', 'forbidden'),
    );
    const req = makeJsonRequest({ method: 'DELETE', path });
    const res = await deleteAllPlatoons(req as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('forbidden');
  });

  it('soft-deletes all platoons on happy path', async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (db.update as any).mockImplementationOnce(() => ({
      set: () => ({
        where: () => ({
          returning: async () => [{ id: 'p1' }, { id: 'p2' }],
        }),
      }),
    }));
    const req = makeJsonRequest({ method: 'DELETE', path });
    const res = await deleteAllPlatoons(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.count).toBe(2);
  });
});

