import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getSubjects, POST as postSubject } from '@/app/api/v1/admin/subjects/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as authz from '@/app/lib/authz';
import * as subjectQueries from '@/app/db/queries/subjects';
import { db } from '@/app/db/client';

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/app/db/queries/subjects', () => ({
  listSubjects: vi.fn(async () => []),
}));

vi.mock('@/app/db/client', () => {
  const insert = vi.fn(() => ({
    values: () => ({
      returning: async () => [
        {
          id: 'sub-1',
          code: 'SUB-1',
          name: 'Subject 1',
          branch: 'C',
          hasTheory: true,
          hasPractical: false,
          defaultTheoryCredits: 3,
          defaultPracticalCredits: null,
          description: null,
        },
      ],
    }),
  }));

  return { db: { insert } };
});

const path = '/api/v1/subjects';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/subjects', () => {
  it('returns 401 when authentication fails', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({ method: 'GET', path });
    const res = await getSubjects(req as any, createRouteContext());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 400 for invalid query parameters', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });

    const req = makeJsonRequest({
      method: 'GET',
      path: `${path}?limit=0`,
    });

    const res = await getSubjects(req as any, createRouteContext());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns 400 for invalid semester filter', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });

    const req = makeJsonRequest({
      method: 'GET',
      path: `${path}?semester=7`,
    });

    const res = await getSubjects(req as any, createRouteContext());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns 400 for invalid courseId filter', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });

    const req = makeJsonRequest({
      method: 'GET',
      path: `${path}?courseId=invalid-course-id`,
    });

    const res = await getSubjects(req as any, createRouteContext());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns filtered list of subjects on happy path', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });
    (subjectQueries.listSubjects as any).mockResolvedValueOnce([
      {
        id: 'sub-1',
        code: 'SUB-1',
        name: 'Subject 1',
        branch: 'C',
        hasTheory: true,
        hasPractical: false,
      },
    ]);

    const req = makeJsonRequest({
      method: 'GET',
      path: `${path}?q=math&branch=C&includeDeleted=true&limit=10&offset=0&semester=1&courseId=11111111-1111-4111-8111-111111111111`,
    });

    const res = await getSubjects(req as any, createRouteContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.items).toHaveLength(1);
    expect(body.count).toBe(1);
    expect(subjectQueries.listSubjects).toHaveBeenCalledWith({
      q: 'math',
      branch: 'C',
      includeDeleted: true,
      limit: 10,
      offset: 0,
      semester: 1,
      courseId: '11111111-1111-4111-8111-111111111111',
    });
  });
});

describe('POST /api/v1/subjects', () => {
  it('returns 401 when not authenticated', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({ method: 'POST', path, body: {} });
    const res = await postSubject(req as any, createRouteContext());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 403 when user lacks admin privileges', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(403, 'Admin privileges required', 'forbidden'),
    );

    const req = makeJsonRequest({
      method: 'POST',
      path,
      body: { code: 'SUB-1', name: 'Subject 1', branch: 'C' },
    });

    const res = await postSubject(req as any, createRouteContext());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('forbidden');
  });

  it('returns 400 when request body fails validation', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });

    const req = makeJsonRequest({ method: 'POST', path, body: { code: '' } });
    const res = await postSubject(req as any, createRouteContext());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns 409 when subject code already exists', async () => {
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
      body: { code: 'SUB-1', name: 'Subject 1', branch: 'C' },
    });

    const res = await postSubject(req as any, createRouteContext());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('conflict');
  });

  it('creates a subject on happy path', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });

    const req = makeJsonRequest({
      method: 'POST',
      path,
      body: {
        code: 'SUB-1',
        name: 'Subject 1',
        branch: 'C',
        hasTheory: true,
        hasPractical: false,
      },
    });

    const res = await postSubject(req as any, createRouteContext());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.subject.id).toBe('sub-1');
    expect(body.subject.code).toBe('SUB-1');
  });
});
