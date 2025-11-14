import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH as patchPlatoon, DELETE as deletePlatoon } from '@/app/api/v1/platoons/[idOrKey]/route';
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
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const basePath = '/api/v1/platoons';
const idOrKey = 'P1';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/v1/platoons/[idOrKey]', () => {
  it('returns 403 when user is not admin', async () => {
    (authz.requireAdmin as any).mockRejectedValueOnce(
      new ApiError(403, 'Admin privileges required', 'forbidden'),
    );
    const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${idOrKey}`, body: { name: 'New' } });
    const ctx = { params: Promise.resolve({ idOrKey }) } as any;
    const res = await patchPlatoon(req as any, ctx);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('forbidden');
  });

  it('returns 400 when body fails validation', async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${idOrKey}`, body: { key: 'x' } });
    const ctx = { params: Promise.resolve({ idOrKey }) } as any;
    const res = await patchPlatoon(req as any, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns 404 when platoon is not found', async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }));
    const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${idOrKey}`, body: { name: 'New' } });
    const ctx = { params: Promise.resolve({ idOrKey }) } as any;
    const res = await patchPlatoon(req as any, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('not_found');
  });

  it('returns 409 when key or name conflicts', async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 'other', key: 'P1', name: 'Platoon A1' }],
        }),
      }),
    }));
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 'existing', key: 'P2', name: 'Platoon B' }],
        }),
      }),
    }));
    const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${idOrKey}`, body: { key: 'P1' } });
    const ctx = { params: Promise.resolve({ idOrKey }) } as any;
    const res = await patchPlatoon(req as any, ctx);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('conflict');
  });

  it('updates platoon on happy path', async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 'p1', key: 'P1', name: 'Old', deletedAt: null }],
        }),
      }),
    }));
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }));
    (db.update as any).mockImplementationOnce(() => ({
      set: () => ({
        where: () => ({
          returning: async () => [
            { id: 'p1', key: 'P1', name: 'Updated', about: null, deletedAt: null },
          ],
        }),
      }),
    }));
    const req = makeJsonRequest({ method: 'PATCH', path: `${basePath}/${idOrKey}`, body: { name: 'Updated' } });
    const ctx = { params: Promise.resolve({ idOrKey }) } as any;
    const res = await patchPlatoon(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.platoon.name).toBe('Updated');
  });
});

describe('DELETE /api/v1/platoons/[idOrKey]', () => {
  it('returns 401 when not authenticated as admin', async () => {
    (authz.requireAdmin as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );
    const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${idOrKey}` });
    const ctx = { params: idOrKey } as any;
    const res = await deletePlatoon(req as any, ctx);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 400 when idOrKey is missing', async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/` });
    const ctx = { params: '' } as any;
    const res = await deletePlatoon(req as any, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('soft-deletes platoon on happy path', async () => {
    (authz.requireAdmin as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 'p1', key: 'P1', name: 'Platoon A', deletedAt: null }],
        }),
      }),
    }));
    (db.update as any).mockImplementationOnce(() => ({
      set: () => ({
        where: () => ({
          returning: async () => [{ id: 'p1', key: 'P1', name: 'Platoon A', deletedAt: new Date() }],
        }),
      }),
    }));
    const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${idOrKey}` });
    const ctx = { params: idOrKey } as any;
    const res = await deletePlatoon(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.platoon.key).toBe('P1');
  });
});

