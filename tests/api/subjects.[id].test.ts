import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GET as getSubjectById,
  PATCH as patchSubject,
  DELETE as deleteSubject,
} from '@/app/api/v1/admin/subjects/[id]/route';
import { makeJsonRequest } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as authz from '@/app/lib/authz';
import { db } from '@/app/db/client';
import * as subjectQueries from '@/app/db/queries/subjects';
import * as auditLog from '@/lib/audit-log';

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

vi.mock('@/app/db/queries/subjects', () => ({
  hardDeleteSubject: vi.fn(),
  softDeleteSubject: vi.fn(),
}));

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
    SUBJECT_CREATED: 'subject.created',
    SUBJECT_UPDATED: 'subject.updated',
    SUBJECT_DELETED: 'subject.deleted',
  },
  AuditResourceType: {
    SUBJECT: 'subject',
  },
}));

const basePath = '/api/v1/subjects';
// Valid RFC4122 UUID (version 4, variant 8) to satisfy z.string().uuid()
const subjectId = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  (auditLog.createAuditLog as any).mockClear?.();
});

describe('GET /api/v1/subjects/[id]', () => {
  it('returns 401 when authentication fails', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${subjectId}` });
    const ctx = { params: Promise.resolve({ id: subjectId }) } as any;

    const res = await getSubjectById(req as any, ctx);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 400 for invalid id param', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });

    const req = makeJsonRequest({ method: 'GET', path: `${basePath}/invalid-id` });
    const ctx = { params: Promise.resolve({ id: 'not-a-uuid' }) } as any;

    const res = await getSubjectById(req as any, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns 404 when subject is not found', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }));

    const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${subjectId}` });
    const ctx = { params: Promise.resolve({ id: subjectId }) } as any;

    const res = await getSubjectById(req as any, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('not_found');
  });

  it('returns subject on happy path', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: subjectId,
              code: 'SUB-1',
              name: 'Subject 1',
              branch: 'C',
            },
          ],
        }),
      }),
    }));

    const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${subjectId}` });
    const ctx = { params: Promise.resolve({ id: subjectId }) } as any;

    const res = await getSubjectById(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.subject.id).toBe(subjectId);
  });
});

describe('PATCH /api/v1/subjects/[id]', () => {
  it('returns 403 when user lacks admin privileges', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(403, 'Admin privileges required', 'forbidden'),
    );

    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePath}/${subjectId}`,
      body: { name: 'New Name' },
    });
    const ctx = { params: Promise.resolve({ id: subjectId }) } as any;

    const res = await patchSubject(req as any, ctx);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('forbidden');
  });

  it('returns 400 when request body has no changes', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });

    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePath}/${subjectId}`,
      body: {},
    });
    const ctx = { params: Promise.resolve({ id: subjectId }) } as any;

    const res = await patchSubject(req as any, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns 409 when updating subject violates unique code constraint', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: subjectId,
              code: 'SUB-1',
              name: 'Subject 1',
            },
          ],
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
      path: `${basePath}/${subjectId}`,
      body: { code: 'SUB-1' },
    });
    const ctx = { params: Promise.resolve({ id: subjectId }) } as any;

    const res = await patchSubject(req as any, ctx);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('conflict');
  });

  it('updates subject on happy path', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: subjectId,
              code: 'SUB-1',
              name: 'Subject 1',
            },
          ],
        }),
      }),
    }));
    (db.update as any).mockImplementationOnce(() => ({
      set: () => ({
        where: () => ({
          returning: async () => [
            {
              id: subjectId,
              code: 'SUB-2',
              name: 'Updated Subject',
            },
          ],
        }),
      }),
    }));

    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePath}/${subjectId}`,
      body: { name: 'Updated Subject' },
    });
    const ctx = { params: Promise.resolve({ id: subjectId }) } as any;

    const res = await patchSubject(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.subject.id).toBe(subjectId);
    expect(body.subject.name).toBe('Updated Subject');
    expect(auditLog.createAuditLog).toHaveBeenCalled();
  });
});

describe('DELETE /api/v1/subjects/[id]', () => {
  it('returns 401 when authentication fails', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${subjectId}` });
    const ctx = { params: Promise.resolve({ id: subjectId }) } as any;

    const res = await deleteSubject(req as any, ctx);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 404 when subject to delete is not found', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (subjectQueries.softDeleteSubject as any).mockResolvedValueOnce(null);

    const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${subjectId}` });
    const ctx = { params: Promise.resolve({ id: subjectId }) } as any;

    const res = await deleteSubject(req as any, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('not_found');
  });

  it('soft-deletes subject on happy path', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (subjectQueries.softDeleteSubject as any).mockResolvedValueOnce({
      before: { id: subjectId, code: 'SUB-1' },
      after: { id: subjectId, code: 'SUB-1', deletedAt: new Date().toISOString() },
    });

    const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${subjectId}` });
    const ctx = { params: Promise.resolve({ id: subjectId }) } as any;

    const res = await deleteSubject(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe(subjectId);
    expect(auditLog.createAuditLog).toHaveBeenCalled();
  });

  it('hard-deletes subject when requested', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (subjectQueries.hardDeleteSubject as any).mockResolvedValueOnce({
      before: { id: subjectId, code: 'SUB-1' },
    });

    const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${subjectId}?hard=true` });
    const ctx = { params: Promise.resolve({ id: subjectId }) } as any;

    const res = await deleteSubject(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.message).toMatch(/hard-deleted/i);
    expect(auditLog.createAuditLog).toHaveBeenCalled();
  });
});
