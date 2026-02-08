import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GET as getCourseById,
  PATCH as patchCourse,
  DELETE as deleteCourse,
} from '@/app/api/v1/admin/courses/[courseId]/route';
import { makeJsonRequest, createRouteContext } from '../utils/next';
import { ApiError } from '@/app/lib/http';
import * as authz from '@/app/lib/authz';
import * as coursesQueries from '@/app/db/queries/courses';

vi.mock('@/app/lib/authz', () => ({
  requireAuth: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock('@/app/db/queries/courses', () => ({
  listCourses: vi.fn(),
  createCourse: vi.fn(),
  getCourse: vi.fn(async () => null),
  listCourseOfferings: vi.fn(async () => []),
  softDeleteCourse: vi.fn(async () => null),
  updateCourse: vi.fn(async () => null),
  hardDeleteCourse: vi.fn(async () => null),
}));

const basePath = '/api/v1/courses';
// Valid RFC4122 UUID (version 4, variant 8) to satisfy z.string().uuid()
const courseId = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/courses/[courseId]', () => {
  it('returns 401 when authentication fails', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${courseId}` });
    const ctx = { params: Promise.resolve({ courseId }) } as any;

    const res = await getCourseById(req as any, ctx);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 400 for invalid courseId param', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });

    const req = makeJsonRequest({ method: 'GET', path: `${basePath}/invalid-id` });
    const ctx = { params: Promise.resolve({ courseId: 'not-a-uuid' }) } as any;

    const res = await getCourseById(req as any, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns 404 when course is not found', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });
    (coursesQueries.getCourse as any).mockResolvedValueOnce(null);

    const req = makeJsonRequest({ method: 'GET', path: `${basePath}/${courseId}` });
    const ctx = { params: Promise.resolve({ courseId }) } as any;

    const res = await getCourseById(req as any, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('not_found');
  });

  it('returns course and offerings on happy path with expand=subjects', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'u1', roles: [] });
    (coursesQueries.getCourse as any).mockResolvedValueOnce({
      id: courseId,
      code: 'TES-50',
      title: 'Course 50',
      notes: null,
    });
    (coursesQueries.listCourseOfferings as any).mockResolvedValueOnce([
      {
        id: 'off-1',
        semester: 3,
        includeTheory: true,
        includePractical: false,
        theoryCredits: 3,
        practicalCredits: null,
        subject: {
          id: 'sub-1',
          code: 'SUB-1',
          name: 'Subject 1',
          branch: 'C',
          hasTheory: true,
          hasPractical: false,
          defaultTheoryCredits: 3,
          defaultPracticalCredits: null,
          description: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          deletedAt: null,
        },
      },
    ]);

    const req = makeJsonRequest({
      method: 'GET',
      path: `${basePath}/${courseId}?expand=subjects&semester=3`,
    });
    const ctx = { params: Promise.resolve({ courseId }) } as any;

    const res = await getCourseById(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.course.id).toBe(courseId);
    expect(body.offerings).toHaveLength(1);
    expect(body.offerings[0].subject.name).toBe('Subject 1');
    expect(coursesQueries.listCourseOfferings).toHaveBeenCalledWith(courseId, 3);
  });
});

describe('PATCH /api/v1/courses/[courseId]', () => {
  it('returns 403 when user lacks admin privileges', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(403, 'Admin privileges required', 'forbidden'),
    );

    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePath}/${courseId}`,
      body: { title: 'New Title' },
    });
    const ctx = { params: Promise.resolve({ courseId }) } as any;

    const res = await patchCourse(req as any, ctx);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('forbidden');
  });

  it('returns 400 when request body fails validation', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });

    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePath}/${courseId}`,
      body: {},
    });
    const ctx = { params: Promise.resolve({ courseId }) } as any;

    const res = await patchCourse(req as any, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('bad_request');
  });

  it('returns 409 when updating course violates unique code constraint', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (coursesQueries.getCourse as any).mockResolvedValueOnce({
      id: courseId,
      code: 'TES-50',
      title: 'Course 50',
      notes: null,
    });
    (coursesQueries.updateCourse as any).mockImplementationOnce(async () => {
      const err: any = new Error('duplicate');
      err.code = '23505';
      throw err;
    });

    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePath}/${courseId}`,
      body: { code: 'TES-50' },
    });
    const ctx = { params: Promise.resolve({ courseId }) } as any;

    const res = await patchCourse(req as any, ctx);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('conflict');
  });

  it('updates course on happy path', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (coursesQueries.getCourse as any).mockResolvedValueOnce({
      id: courseId,
      code: 'TES-50',
      title: 'Old Title',
      notes: null,
    });
    (coursesQueries.updateCourse as any).mockResolvedValueOnce({
      id: courseId,
      code: 'TES-51',
      title: 'Updated Course',
      notes: 'Updated',
    });

    const req = makeJsonRequest({
      method: 'PATCH',
      path: `${basePath}/${courseId}`,
      body: { title: 'Updated Course', restore: true },
    });
    const ctx = { params: Promise.resolve({ courseId }) } as any;

    const res = await patchCourse(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.course.id).toBe(courseId);
    expect(body.course.title).toBe('Updated Course');
  });
});

describe('DELETE /api/v1/courses/[courseId]', () => {
  it('returns 401 when authentication fails', async () => {
    (authz.requireAuth as any).mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'unauthorized'),
    );

    const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${courseId}` });
    const ctx = { params: Promise.resolve({ courseId }) } as any;

    const res = await deleteCourse(req as any, ctx);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 404 when course to delete is not found', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (coursesQueries.softDeleteCourse as any).mockResolvedValueOnce(null);

    const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${courseId}` });
    const ctx = { params: Promise.resolve({ courseId }) } as any;

    const res = await deleteCourse(req as any, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('not_found');
  });

  it('soft-deletes course on happy path', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (coursesQueries.softDeleteCourse as any).mockResolvedValueOnce({
      before: { id: courseId, code: 'TES-50' },
      after: { id: courseId, code: 'TES-50', deletedAt: new Date().toISOString() },
    });

    const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${courseId}` });
    const ctx = { params: Promise.resolve({ courseId }) } as any;

    const res = await deleteCourse(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe(courseId);
  });

  it('hard-deletes course when requested', async () => {
    (authz.requireAuth as any).mockResolvedValueOnce({ userId: 'admin-1', roles: ['ADMIN'] });
    (coursesQueries.hardDeleteCourse as any).mockResolvedValueOnce({
      before: { id: courseId, code: 'TES-50' },
    });

    const req = makeJsonRequest({ method: 'DELETE', path: `${basePath}/${courseId}?hard=true` });
    const ctx = { params: Promise.resolve({ courseId }) } as any;

    const res = await deleteCourse(req as any, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe(courseId);
    expect(body.message).toMatch(/hard-deleted/i);
  });
});
