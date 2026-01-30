import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getInstructors, POST as postInstructor } from '@/app/api/v1/admin/instructors/route';
import { makeJsonRequest } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as authz from '@/app/lib/authz';
import * as instructorQueries from '@/app/db/queries/instructors';
import { db } from '@/app/db/client';
import * as auditLog from '@/lib/audit-log';

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock('@/app/db/queries/instructors', () => ({
  listInstructors: vi.fn(async () => []),
}));

vi.mock('@/app/db/client', () => {
  const insert = vi.fn(() => ({
    values: () => ({
      returning: async () => [
        {
          id: 'inst-1',
          userId: '11111111-1111-4111-8111-111111111111',
          name: 'Instructor One',
          email: 'inst1@example.com',
          phone: '123',
          affiliation: 'External',
          notes: null,
        },
      ],
    }),
  }));
  const select = vi.fn(() => ({
    from: () => ({
      where: () => ({
        limit: () =>
          Promise.resolve([
            {
              id: '11111111-1111-4111-8111-111111111111',
              name: 'Linked User',
              email: 'linked@example.com',
              phone: '5551234',
            },
          ]),
      }),
    }),
  }));
  return { db: { insert, select } };
});

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
    INSTRUCTOR_CREATED: 'instructor.created',
    INSTRUCTOR_UPDATED: 'instructor.updated',
    INSTRUCTOR_DELETED: 'instructor.deleted',
  },
  AuditResourceType: {
    INSTRUCTOR: 'instructor',
  },
}));

const path = '/api/v1/admin/instructors';

beforeEach(() => {
  vi.clearAllMocks();
  (auditLog.createAuditLog as any).mockClear?.();
});

describe('GET /api/v1/admin/instructors', () => {
  it('returns 401 when auth fails', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );
    const req = makeJsonRequest({ method: 'GET', path });
    const res = await getInstructors(req as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns filtered instructors on happy path', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });
    (instructorQueries.listInstructors as any).mockResolvedValueOnce([
      { id: 'inst-1', name: 'Instructor One', deletedAt: null },
    ]);
    const req = makeJsonRequest({
      method: 'GET',
      path: `${path}?q=inst&includeDeleted=true&limit=10&offset=5`,
    });
    const res = await getInstructors(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.items).toHaveLength(1);
    expect(body.count).toBe(1);
    expect(instructorQueries.listInstructors).toHaveBeenCalledWith({
      q: 'inst',
      includeDeleted: true,
      limit: 10,
      offset: 5,
    });
  });
});

describe('POST /api/v1/admin/instructors', () => {
  it('returns 401 when not authenticated', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );
    const req = makeJsonRequest({ method: 'POST', path, body: {} });
    const res = await postInstructor(req as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 400 when external instructor is missing contact info', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
      userId: 'admin-1',
      roles: ['ADMIN'],
    });
    const req = makeJsonRequest({
      method: 'POST',
      path,
      body: { name: 'Ext Instructor' },
    });
    const res = await postInstructor(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns 400 when userId does not resolve to an active user', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({
      userId: 'admin-1',
      roles: ['ADMIN'],
    });
    (db.select as any).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    }));
    const req = makeJsonRequest({
      method: 'POST',
      path,
      body: {
        userId: '11111111-1111-4111-8111-111111111111',
      },
    });
    const res = await postInstructor(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns 409 when unique constraint is violated', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (db.insert as any).mockImplementationOnce(() => ({
      values: () => ({
        returning: async () => {
          const err: any = new Error('duplicate');
          err.code = '23505';
          throw err;
        },
      }),
    }));
    const req = makeJsonRequest({
      method: 'POST',
      path,
      body: {
        userId: '11111111-1111-4111-8111-111111111111',
        name: 'Instructor One',
      },
    });
    const res = await postInstructor(req as any);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('conflict');
  });

  it('creates instructor on happy path', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    const req = makeJsonRequest({
      method: 'POST',
      path,
      body: {
        userId: '11111111-1111-4111-8111-111111111111',
      },
    });
    const res = await postInstructor(req as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.instructor.id).toBe('inst-1');
    expect(body.instructor.name).toBe('Instructor One');
    expect(auditLog.createAuditLog).toHaveBeenCalled();
  });
});
