import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GET as getInstructor,
  PATCH as patchInstructor,
  DELETE as deleteInstructor,
} from '@/app/api/v1/admin/instructors/[id]/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as authz from '@/app/lib/authz';
import { db } from '@/app/db/client';
import * as instructorQueries from '@/app/db/queries/instructors';

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock('@/app/db/client', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/app/db/queries/instructors', () => ({
  softDeleteInstructor: vi.fn(),
  hardDeleteInstructor: vi.fn(),
}));

const basePath = '/api/v1/admin/instructors';
const instructorId = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/admin/instructors/[id]', () => {
  it('returns 401 when auth fails', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );
    const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${instructorId}` });
    const ctx = { params: Promise.resolve({ id: instructorId }) } as any;
    const res = await getInstructor(req as any, ctx);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 400 for invalid id', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });
    const req = makeJsonRequest({ method: 'GET', path: `${basePath}/not-a-uuid` });
    const ctx = { params: Promise.resolve({ id: 'not-a-uuid' }) } as any;
    const res = await getInstructor(req as any, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns 404 when instructor not found', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({ where: () => ({ limit: async () => [] }) }),
    }));
    const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${instructorId}` });
    const ctx = { params: Promise.resolve({ id: instructorId }) } as any;
    const res = await getInstructor(req as any, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('not_found');
  });

  it('returns instructor on happy path', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: instructorId, name: 'Instructor One' }],
        }),
      }),
    }));
    const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${instructorId}` });
    const ctx = { params: Promise.resolve({ id: instructorId }) } as any;
    const res = await getInstructor(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.instructor.id).toBe(instructorId);
  });
});

describe('PATCH /api/v1/admin/instructors/[id]', () => {
  it('returns 403 when user lacks admin role', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(403, 'Admin privileges required', 'forbidden'),
    );
    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePath}/${instructorId}`,
      body: { name: 'New Name' },
    });
    const ctx = { params: Promise.resolve({ id: instructorId }) } as any;
    const res = await patchInstructor(req as any, ctx);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('forbidden');
  });

  it('returns 400 when body has no changes', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePath}/${instructorId}`,
      body: {},
    });
    const ctx = { params: Promise.resolve({ id: instructorId }) } as any;
    const res = await patchInstructor(req as any, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns 409 when update violates unique constraint', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: instructorId, name: 'Instructor One' }],
        }),
      }),
    }));
    (db.update as any).mockImplementationOnce(() => ({
      set: () => ({
        where: () => ({
          returning: async () => {
            const err: any = new Error('duplicate');
            err.code = '23505';
            throw err;
          },
        }),
      }),
    }));
    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePath}/${instructorId}`,
      body: { name: 'New Name' },
    });
    const ctx = { params: Promise.resolve({ id: instructorId }) } as any;
    const res = await patchInstructor(req as any, ctx);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('conflict');
  });

  it('updates instructor on happy path', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: instructorId, name: 'Instructor One' }],
        }),
      }),
    }));
    (db.update as any).mockImplementationOnce(() => ({
      set: () => ({
        where: () => ({
          returning: async () => [{ id: instructorId, name: 'Updated Name' }],
        }),
      }),
    }));
    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePath}/${instructorId}`,
      body: { name: 'Updated Name' },
    });
    const ctx = { params: Promise.resolve({ id: instructorId }) } as any;
    const res = await patchInstructor(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.instructor.name).toBe('Updated Name');
  });
});

describe('DELETE /api/v1/admin/instructors/[id]', () => {
  it('returns 401 when not authenticated as admin', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );
    const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${instructorId}` });
    const ctx = { params: Promise.resolve({ id: instructorId }) } as any;
    const res = await deleteInstructor(req as any, ctx);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 404 when instructor to delete is not found', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (instructorQueries.softDeleteInstructor as any).mockResolvedValueOnce(null);
    const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${instructorId}` });
    const ctx = { params: Promise.resolve({ id: instructorId }) } as any;
    const res = await deleteInstructor(req as any, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('not_found');
  });

  it('soft-deletes instructor on happy path', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (instructorQueries.softDeleteInstructor as any).mockResolvedValueOnce({
      before: { id: instructorId },
      after: { id: instructorId, deletedAt: new Date().toISOString() },
    });
    const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${instructorId}` });
    const ctx = { params: Promise.resolve({ id: instructorId }) } as any;
    const res = await deleteInstructor(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe(instructorId);
    expect(instructorQueries.softDeleteInstructor).toHaveBeenCalledWith(instructorId);
  });

  it('hard-deletes instructor when ?hard=true', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (instructorQueries.hardDeleteInstructor as any).mockResolvedValueOnce({
      before: { id: instructorId },
    });
    const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${instructorId}?hard=true` });
    const ctx = { params: Promise.resolve({ id: instructorId }) } as any;
    const res = await deleteInstructor(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe(instructorId);
    expect(instructorQueries.hardDeleteInstructor).toHaveBeenCalledWith(instructorId);
  });
});
